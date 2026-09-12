import {
  Character,
  CellCoord,
  FloatingText,
  GameMode,
  GameState,
  KillFeedItem,
  LeaderboardEntry,
  MatchStats,
  Particle,
  Point,
  SkinConfig,
  TrailNode,
} from '../types';
import {
  BASE_RADIUS_CELLS,
  BASE_SPEED,
  BOT_COUNT,
  BOT_NAMES,
  CELL_SIZE,
  GRID_SIZE,
  ICONS_LIST,
  PLAYER_ID,
  SKINS,
  WORLD_SIZE,
} from '../utils/constants';
import { sound } from '../utils/audio';

export class GameEngine {
  public grid: Uint8Array; // 0 = neutral, 1 = player, 2..N = bots
  public trailGrid: Uint8Array; // 0 = none, or owner ID

  public player: Character;
  public bots: Character[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public killFeed: KillFeedItem[] = [];

  public gameState: GameState = 'menu';
  public gameMode: GameMode = 'classic';
  public gameTimer: number = 0; // seconds elapsed
  public rushTimeRemaining: number = 120; // 2 minutes for rush mode
  public royaleZoneRadius: number = WORLD_SIZE * 0.7; // for battle royale

  // Viewport & camera
  public cameraX: number = 0;
  public cameraY: number = 0;
  public zoom: number = 1.0;

  // Next available bot ID
  private nextBotId: number = 2;
  private onGameOverCallback?: (stats: MatchStats) => void;
  private onStatsUpdateCallback?: () => void;

  constructor() {
    this.grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
    this.trailGrid = new Uint8Array(GRID_SIZE * GRID_SIZE);
    this.player = this.createDefaultPlayer();
  }

  public setCallbacks(
    onGameOver: (stats: MatchStats) => void,
    onStatsUpdate: () => void
  ) {
    this.onGameOverCallback = onGameOver;
    this.onStatsUpdateCallback = onStatsUpdate;
  }

  private createDefaultPlayer(): Character {
    const defaultSkin = SKINS[0];
    return {
      id: PLAYER_ID,
      name: 'Player',
      color: defaultSkin.primaryColor,
      trailColor: defaultSkin.trailColor,
      strokeColor: defaultSkin.strokeColor,
      darkColor: defaultSkin.darkColor,
      icon: defaultSkin.icon,
      isBot: false,
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2,
      vx: BASE_SPEED,
      vy: 0,
      angle: 0,
      targetAngle: 0,
      speed: BASE_SPEED,
      alive: true,
      kills: 0,
      territoryCount: 0,
      territoryPercentage: 0,
      trail: [],
    };
  }

  public startMatch(
    playerName: string,
    skin: SkinConfig,
    mode: GameMode = 'classic'
  ) {
    this.gameMode = mode;
    this.gameState = 'playing';
    this.gameTimer = 0;
    this.rushTimeRemaining = 120;
    this.royaleZoneRadius = WORLD_SIZE * 0.65;
    this.nextBotId = 2;

    // Reset grids
    this.grid.fill(0);
    this.trailGrid.fill(0);
    this.particles = [];
    this.floatingTexts = [];
    this.killFeed = [];

    // Initialize player at a safe central-ish quadrant
    const playerStartCX = Math.floor(GRID_SIZE * 0.45 + (Math.random() * 0.1) * GRID_SIZE);
    const playerStartCY = Math.floor(GRID_SIZE * 0.45 + (Math.random() * 0.1) * GRID_SIZE);

    this.player = {
      id: PLAYER_ID,
      name: playerName.trim() || 'Player',
      color: skin.primaryColor,
      trailColor: skin.trailColor,
      strokeColor: skin.strokeColor,
      darkColor: skin.darkColor,
      icon: skin.icon,
      isBot: false,
      x: (playerStartCX + 0.5) * CELL_SIZE,
      y: (playerStartCY + 0.5) * CELL_SIZE,
      vx: BASE_SPEED,
      vy: 0,
      angle: 0,
      targetAngle: 0,
      speed: BASE_SPEED,
      alive: true,
      kills: 0,
      territoryCount: 0,
      territoryPercentage: 0,
      trail: [],
    };

    this.cameraX = this.player.x;
    this.cameraY = this.player.y;
    this.zoom = 1.0;

    // Spawn initial territory for player
    this.claimInitialBase(this.player, playerStartCX, playerStartCY);

    // Spawn bots
    this.bots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      this.spawnBot();
    }

    this.updateTerritoryStats();
  }

  private claimInitialBase(char: Character, centerCX: number, centerCY: number) {
    const rad = BASE_RADIUS_CELLS;
    let count = 0;

    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        // Circle base shape
        if (dx * dx + dy * dy <= rad * rad) {
          const cx = centerCX + dx;
          const cy = centerCY + dy;
          if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE) {
            const idx = cy * GRID_SIZE + cx;
            // Free from any previous owner
            const prevOwnerId = this.grid[idx];
            if (prevOwnerId !== 0 && prevOwnerId !== char.id) {
              const prevOwner = this.getCharacterById(prevOwnerId);
              if (prevOwner) prevOwner.territoryCount = Math.max(0, prevOwner.territoryCount - 1);
            }
            this.grid[idx] = char.id;
            count++;
          }
        }
      }
    }
    char.territoryCount += count;
  }

  private spawnBot() {
    const botId = this.nextBotId++;
    const skin = SKINS[(botId + 2) % SKINS.length];
    const name = BOT_NAMES[(botId * 3) % BOT_NAMES.length];
    const icon = ICONS_LIST[botId % ICONS_LIST.length];

    // Find unoccupied spot
    let startCX = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));
    let startCY = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));

    // Try a few times to find unowned spot
    for (let attempts = 0; attempts < 10; attempts++) {
      const idx = startCY * GRID_SIZE + startCX;
      if (this.grid[idx] === 0) break;
      startCX = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));
      startCY = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));
    }

    const personalities: Array<'aggressive' | 'cautious' | 'expander' | 'hunter'> = [
      'aggressive',
      'cautious',
      'expander',
      'hunter',
    ];
    const personality = personalities[botId % personalities.length];

    const angle = Math.random() * Math.PI * 2;
    const bot: Character = {
      id: botId,
      name,
      color: skin.primaryColor,
      trailColor: skin.trailColor,
      strokeColor: skin.strokeColor,
      darkColor: skin.darkColor,
      icon,
      isBot: true,
      x: (startCX + 0.5) * CELL_SIZE,
      y: (startCY + 0.5) * CELL_SIZE,
      vx: Math.cos(angle) * (BASE_SPEED * 0.95),
      vy: Math.sin(angle) * (BASE_SPEED * 0.95),
      angle,
      targetAngle: angle,
      speed: BASE_SPEED * (0.9 + Math.random() * 0.15),
      alive: true,
      kills: 0,
      territoryCount: 0,
      territoryPercentage: 0,
      trail: [],
      personality,
      botTimer: 0,
      botTarget: null,
    };

    this.claimInitialBase(bot, startCX, startCY);
    this.bots.push(bot);
  }

  public getCharacterById(id: number): Character | undefined {
    if (this.player.id === id) return this.player;
    return this.bots.find((b) => b.id === id);
  }

  // Handle player directional inputs
  public handleInputDirection(dx: number, dy: number) {
    if (!this.player.alive || this.gameState !== 'playing') return;
    if (dx === 0 && dy === 0) return;

    const angle = Math.atan2(dy, dx);
    // Disallow exact 180-degree instant reversal that would immediately reverse into self
    const diff = Math.abs(Math.atan2(Math.sin(angle - this.player.angle), Math.cos(angle - this.player.angle)));
    if (diff > Math.PI * 0.9 && this.player.trail.length > 2) {
      return; // prevent suicidal instant 180 back into trail
    }

    this.player.targetAngle = angle;
  }

  public handleInputAngle(angle: number) {
    if (!this.player.alive || this.gameState !== 'playing') return;
    const diff = Math.abs(Math.atan2(Math.sin(angle - this.player.angle), Math.cos(angle - this.player.angle)));
    if (diff > Math.PI * 0.92 && this.player.trail.length > 2) {
      return;
    }
    this.player.targetAngle = angle;
  }

  // Main game update step (delta in seconds)
  public update(dt: number) {
    if (this.gameState !== 'playing') return;

    this.gameTimer += dt;

    if (this.gameMode === 'rush') {
      this.rushTimeRemaining = Math.max(0, this.rushTimeRemaining - dt);
      if (this.rushTimeRemaining <= 0) {
        this.endMatchByTime();
        return;
      }
    } else if (this.gameMode === 'royale') {
      // Shrink zone
      this.royaleZoneRadius = Math.max(CELL_SIZE * 15, this.royaleZoneRadius - dt * 9);
    }

    // Update player
    if (this.player.alive) {
      this.updateCharacter(this.player, dt);
    }

    // Update bots
    for (const bot of this.bots) {
      if (bot.alive) {
        this.updateBotAI(bot, dt);
        this.updateCharacter(bot, dt);
      } else {
        // Handle bot respawn timer
        if (!bot.respawnTime) bot.respawnTime = this.gameTimer + 3.5;
        if (this.gameTimer >= bot.respawnTime) {
          this.respawnBot(bot);
        }
      }
    }

    // Update particles & floating text
    this.updateVisualEffects(dt);

    // Update camera smooth follow
    if (this.player.alive) {
      const targetCamX = this.player.x;
      const targetCamY = this.player.y;
      this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 7);
      this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 7);

      // Camera dynamic zoom based on claimed area (gradual scale 1.0 down to 0.72)
      const targetZoom = Math.max(0.72, 1.0 - (this.player.territoryPercentage / 100) * 0.28);
      this.zoom += (targetZoom - this.zoom) * Math.min(1, dt * 3);
    }

    // Check victory condition (100% or close)
    if (this.player.alive && this.player.territoryPercentage >= 99.5) {
      this.triggerVictory();
    }
  }

  private updateCharacter(char: Character, dt: number) {
    // Smooth angle interpolation
    let angleDiff = Math.atan2(
      Math.sin(char.targetAngle - char.angle),
      Math.cos(char.targetAngle - char.angle)
    );
    const turnRate = 12 * dt;
    if (Math.abs(angleDiff) < turnRate) {
      char.angle = char.targetAngle;
    } else {
      char.angle += Math.sign(angleDiff) * turnRate;
    }

    char.vx = Math.cos(char.angle) * char.speed;
    char.vy = Math.sin(char.angle) * char.speed;

    const nextX = char.x + char.vx * dt;
    const nextY = char.y + char.vy * dt;

    // Check bounds / walls
    if (nextX < 10 || nextX > WORLD_SIZE - 10 || nextY < 10 || nextY > WORLD_SIZE - 10) {
      if (!char.isBot) {
        this.eliminateCharacter(char, null, 'Crashed into the arena boundary');
        return;
      } else {
        // Bot bounces away from wall
        char.targetAngle = Math.atan2(
          WORLD_SIZE / 2 - char.y,
          WORLD_SIZE / 2 - char.x
        );
        char.angle = char.targetAngle;
      }
    }

    // Check Battle Royale zone
    if (this.gameMode === 'royale') {
      const distFromCenter = Math.hypot(char.x - WORLD_SIZE / 2, char.y - WORLD_SIZE / 2);
      if (distFromCenter > this.royaleZoneRadius) {
        this.eliminateCharacter(char, null, 'Consumed by the toxic storm zone');
        return;
      }
    }

    char.x = Math.max(8, Math.min(WORLD_SIZE - 8, nextX));
    char.y = Math.max(8, Math.min(WORLD_SIZE - 8, nextY));

    const cx = Math.floor(char.x / CELL_SIZE);
    const cy = Math.floor(char.y / CELL_SIZE);

    if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return;

    const cellIndex = cy * GRID_SIZE + cx;
    const cellOwner = this.grid[cellIndex];

    // Is player outside their own territory?
    const isOutside = cellOwner !== char.id;

    if (isOutside) {
      // Stepping outside -> record trail
      const lastNode = char.trail[char.trail.length - 1];
      const dist = lastNode ? Math.hypot(char.x - lastNode.x, char.y - lastNode.y) : 999;

      // Add trail node if moved enough distance
      if (!lastNode || dist >= CELL_SIZE * 0.45) {
        // Check self-collision: did char hit their own previous trail?
        if (char.trail.length > 5) {
          // Check collision with older nodes
          for (let i = 0; i < char.trail.length - 4; i++) {
            const node = char.trail[i];
            const d = Math.hypot(char.x - node.x, char.y - node.y);
            if (d < CELL_SIZE * 0.6) {
              // Self elimination!
              this.eliminateCharacter(char, null, 'Crossed own paper trail');
              return;
            }
          }
        }

        const newNode: TrailNode = { x: char.x, y: char.y, cx, cy };
        char.trail.push(newNode);
        this.trailGrid[cellIndex] = char.id;

        // Occasional trail particles
        if (Math.random() < 0.25) {
          this.particles.push({
            x: char.x + (Math.random() - 0.5) * 6,
            y: char.y + (Math.random() - 0.5) * 6,
            vx: -char.vx * 0.1 + (Math.random() - 0.5) * 20,
            vy: -char.vy * 0.1 + (Math.random() - 0.5) * 20,
            color: char.trailColor,
            size: 3 + Math.random() * 2,
            alpha: 0.6,
            life: 0,
            maxLife: 0.4,
          });
        }
      }
    } else {
      // Inside own territory!
      // If char had a trail, we now complete the capture!
      if (char.trail.length > 0) {
        this.captureTerritory(char);
      }
    }

    // Check if char cut another player's trail
    this.checkTrailCuts(char);
  }

  // Check if attacker cut any defender's trail
  private checkTrailCuts(attacker: Character) {
    const allCharacters = [this.player, ...this.bots];

    for (const victim of allCharacters) {
      if (!victim.alive || victim.id === attacker.id || victim.trail.length === 0) continue;

      // Check if attacker's head is near any point in victim's trail
      for (let i = 0; i < victim.trail.length; i++) {
        const node = victim.trail[i];
        const dist = Math.hypot(attacker.x - node.x, attacker.y - node.y);

        if (dist < CELL_SIZE * 0.8) {
          // VICTIM ELIMINATED!
          attacker.kills++;
          this.eliminateCharacter(victim, attacker, `Cut by ${attacker.name}`);

          if (!attacker.isBot) {
            sound.playKill();
            this.addFloatingText(`+1 KILL!`, victim.x, victim.y, '#ffd32a', 20);
          }
          break;
        }
      }
    }
  }

  // Territory capture using robust flood fill
  private captureTerritory(char: Character) {
    const trail = char.trail;
    if (trail.length === 0) return;

    // 1. Mark all trail cells as owned by char
    for (const node of trail) {
      const idx = node.cy * GRID_SIZE + node.cx;
      if (idx >= 0 && idx < this.grid.length) {
        const prevOwner = this.grid[idx];
        if (prevOwner !== 0 && prevOwner !== char.id) {
          const victim = this.getCharacterById(prevOwner);
          if (victim) victim.territoryCount = Math.max(0, victim.territoryCount - 1);
        }
        if (this.grid[idx] !== char.id) {
          this.grid[idx] = char.id;
          char.territoryCount++;
        }
      }
    }

    // 2. Find bounding box of player's trail + a margin
    let minCX = GRID_SIZE;
    let maxCX = 0;
    let minCY = GRID_SIZE;
    let maxCY = 0;

    for (const node of trail) {
      if (node.cx < minCX) minCX = node.cx;
      if (node.cx > maxCX) maxCX = node.cx;
      if (node.cy < minCY) minCY = node.cy;
      if (node.cy > maxCY) maxCY = node.cy;
    }

    // Also include surrounding owned cells to form the closed loop with existing base
    minCX = Math.max(0, minCX - 4);
    maxCX = Math.min(GRID_SIZE - 1, maxCX + 4);
    minCY = Math.max(0, minCY - 4);
    maxCY = Math.min(GRID_SIZE - 1, maxCY + 4);

    const bWidth = maxCX - minCX + 1;
    const bHeight = maxCY - minCY + 1;
    const bSize = bWidth * bHeight;

    // 3. Flood fill from the outer edges of this bounding box through all cells NOT owned by char
    const visited = new Uint8Array(bSize);
    const queueX: number[] = [];
    const queueY: number[] = [];

    // Push bounding box boundary cells
    for (let x = minCX; x <= maxCX; x++) {
      this.enqueueIfOpen(x, minCY, minCX, minCY, bWidth, char.id, visited, queueX, queueY);
      this.enqueueIfOpen(x, maxCY, minCX, minCY, bWidth, char.id, visited, queueX, queueY);
    }
    for (let y = minCY; y <= maxCY; y++) {
      this.enqueueIfOpen(minCX, y, minCX, minCY, bWidth, char.id, visited, queueX, queueY);
      this.enqueueIfOpen(maxCX, y, minCX, minCY, bWidth, char.id, visited, queueX, queueY);
    }

    let head = 0;
    while (head < queueX.length) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= minCX && nx <= maxCX && ny >= minCY && ny <= maxCY) {
          this.enqueueIfOpen(nx, ny, minCX, minCY, bWidth, char.id, visited, queueX, queueY);
        }
      }
    }

    // 4. Any cell inside bounding box that was NOT reached is enclosed!
    let capturedCount = 0;
    for (let y = minCY; y <= maxCY; y++) {
      for (let x = minCX; x <= maxCX; x++) {
        const localIdx = (y - minCY) * bWidth + (x - minCX);
        if (visited[localIdx] === 0) {
          const globalIdx = y * GRID_SIZE + x;
          const currentOwner = this.grid[globalIdx];
          if (currentOwner !== char.id) {
            if (currentOwner !== 0) {
              const prev = this.getCharacterById(currentOwner);
              if (prev) prev.territoryCount = Math.max(0, prev.territoryCount - 1);
            }
            this.grid[globalIdx] = char.id;
            char.territoryCount++;
            capturedCount++;

            // Burst sparkles
            if (capturedCount % 8 === 0) {
              this.particles.push({
                x: (x + 0.5) * CELL_SIZE,
                y: (y + 0.5) * CELL_SIZE,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 40,
                color: char.trailColor,
                size: 2.5 + Math.random() * 2,
                alpha: 0.8,
                life: 0,
                maxLife: 0.5,
              });
            }
          }
        }
      }
    }

    // Clear trail
    for (const node of char.trail) {
      const idx = node.cy * GRID_SIZE + node.cx;
      this.trailGrid[idx] = 0;
    }
    char.trail = [];

    // Feedback
    this.updateTerritoryStats();

    if (!char.isBot) {
      const percentGain = ((capturedCount / (GRID_SIZE * GRID_SIZE)) * 100).toFixed(1);
      sound.playCapture(capturedCount / (GRID_SIZE * GRID_SIZE));
      if (capturedCount > 10) {
        this.addFloatingText(
          `+${percentGain}%`,
          char.x,
          char.y - 20,
          char.color,
          18
        );
      }
    }
  }

  private enqueueIfOpen(
    cx: number,
    cy: number,
    minCX: number,
    minCY: number,
    bWidth: number,
    charId: number,
    visited: Uint8Array,
    queueX: number[],
    queueY: number[]
  ) {
    const localIdx = (cy - minCY) * bWidth + (cx - minCX);
    if (visited[localIdx] === 1) return;

    const globalIdx = cy * GRID_SIZE + cx;
    if (this.grid[globalIdx] === charId) {
      // Stop at player's own claimed territory
      return;
    }

    visited[localIdx] = 1;
    queueX.push(cx);
    queueY.push(cy);
  }

  private eliminateCharacter(victim: Character, killer: Character | null, reason: string) {
    victim.alive = false;
    victim.deathReason = reason;
    victim.deathX = victim.x;
    victim.deathY = victim.y;

    // Remove victim's trail
    for (const node of victim.trail) {
      const idx = node.cy * GRID_SIZE + node.cx;
      this.trailGrid[idx] = 0;
    }
    victim.trail = [];

    // Turn victim's territory neutral gradually or drop shards
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === victim.id) {
        this.grid[i] = 0;
      }
    }
    victim.territoryCount = 0;

    // Spawn elimination confetti particles
    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        x: victim.x,
        y: victim.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: victim.color,
        size: 3.5 + Math.random() * 3.5,
        alpha: 1,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
      });
    }

    // Killfeed entry
    const killerName = killer ? killer.name : 'The Arena';
    const killerColor = killer ? killer.color : '#e74c3c';
    this.killFeed.unshift({
      id: Math.random().toString(),
      text: `${killerName} eliminated ${victim.name}`,
      killerColor,
      victimColor: victim.color,
      timestamp: Date.now(),
    });
    if (this.killFeed.length > 5) this.killFeed.pop();

    this.updateTerritoryStats();

    // If the human player was eliminated
    if (!victim.isBot) {
      sound.playDeath();
      this.endMatch(false, killer?.name, reason);
    }
  }

  private respawnBot(bot: Character) {
    bot.alive = true;
    bot.respawnTime = undefined;
    bot.trail = [];
    bot.territoryCount = 0;

    let startCX = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));
    let startCY = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));

    for (let i = 0; i < 10; i++) {
      const idx = startCY * GRID_SIZE + startCX;
      if (this.grid[idx] === 0) break;
      startCX = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));
      startCY = 15 + Math.floor(Math.random() * (GRID_SIZE - 30));
    }

    bot.x = (startCX + 0.5) * CELL_SIZE;
    bot.y = (startCY + 0.5) * CELL_SIZE;
    const angle = Math.random() * Math.PI * 2;
    bot.angle = angle;
    bot.targetAngle = angle;
    bot.vx = Math.cos(angle) * bot.speed;
    bot.vy = Math.sin(angle) * bot.speed;

    this.claimInitialBase(bot, startCX, startCY);
    this.updateTerritoryStats();
  }

  // Smart Bot Decision Making
  private updateBotAI(bot: Character, dt: number) {
    if (!bot.botTimer) bot.botTimer = 0;
    bot.botTimer -= dt;

    const currentCX = Math.floor(bot.x / CELL_SIZE);
    const currentCY = Math.floor(bot.y / CELL_SIZE);
    const insideBase = this.grid[currentCY * GRID_SIZE + currentCX] === bot.id;

    // Safety threshold: don't let trail get excessively long
    const maxSafeTrail = bot.personality === 'cautious' ? 14 : bot.personality === 'aggressive' ? 28 : 22;

    if (insideBase) {
      // In base: periodically wander towards edge to start a loop
      if (bot.botTimer <= 0) {
        bot.botTimer = 0.5 + Math.random() * 0.8;
        // Steer outwards
        bot.targetAngle = (Math.floor(Math.random() * 4) * Math.PI) / 2;
      }
    } else {
      // Outside base:
      // If trail is too long or under threat -> head directly back to nearest base tile
      if (bot.trail.length >= maxSafeTrail) {
        this.steerBotHome(bot);
      } else if (bot.botTimer <= 0) {
        // Curve around to complete loop
        bot.botTimer = 0.4 + Math.random() * 0.6;

        // Either curve 90 degrees left or right to close loop
        const turn = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        bot.targetAngle = bot.angle + turn;
      }

      // Check nearby threats: if an enemy is close to bot's trail, retreat!
      if (bot.personality === 'cautious') {
        const nearbyEnemy = this.findNearbyEnemy(bot.x, bot.y, bot.id, 120);
        if (nearbyEnemy) {
          this.steerBotHome(bot);
        }
      }
    }

    // Bot wall avoidance
    const margin = 50;
    if (bot.x < margin) bot.targetAngle = 0;
    else if (bot.x > WORLD_SIZE - margin) bot.targetAngle = Math.PI;
    else if (bot.y < margin) bot.targetAngle = Math.PI / 2;
    else if (bot.y > WORLD_SIZE - margin) bot.targetAngle = -Math.PI / 2;
  }

  private steerBotHome(bot: Character) {
    const cx = Math.floor(bot.x / CELL_SIZE);
    const cy = Math.floor(bot.y / CELL_SIZE);

    // Search nearest tile owned by bot
    let bestDist = 999999;
    let targetX = WORLD_SIZE / 2;
    let targetY = WORLD_SIZE / 2;

    const r = 16;
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          if (this.grid[ny * GRID_SIZE + nx] === bot.id) {
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
              bestDist = d;
              targetX = (nx + 0.5) * CELL_SIZE;
              targetY = (ny + 0.5) * CELL_SIZE;
            }
          }
        }
      }
    }

    bot.targetAngle = Math.atan2(targetY - bot.y, targetX - bot.x);
  }

  private findNearbyEnemy(x: number, y: number, myId: number, maxDist: number): Character | null {
    const all = [this.player, ...this.bots];
    for (const other of all) {
      if (!other.alive || other.id === myId) continue;
      if (Math.hypot(other.x - x, other.y - y) < maxDist) {
        return other;
      }
    }
    return null;
  }

  public updateTerritoryStats() {
    const totalCells = GRID_SIZE * GRID_SIZE;
    this.player.territoryPercentage = Number(((this.player.territoryCount / totalCells) * 100).toFixed(1));

    for (const bot of this.bots) {
      bot.territoryPercentage = Number(((bot.territoryCount / totalCells) * 100).toFixed(1));
    }

    if (this.onStatsUpdateCallback) {
      this.onStatsUpdateCallback();
    }
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const all = [this.player, ...this.bots];
    all.sort((a, b) => b.territoryPercentage - a.territoryPercentage);

    return all.map((c, index) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      percentage: c.territoryPercentage,
      kills: c.kills,
      isPlayer: c.id === this.player.id,
      rank: index + 1,
      icon: c.icon,
    }));
  }

  public addFloatingText(text: string, x: number, y: number, color: string, size = 16) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      alpha: 1,
      life: 0,
      maxLife: 1.2,
      size,
    });
  }

  private updateVisualEffects(dt: number) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y -= 25 * dt; // rise upward
      ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private triggerVictory() {
    this.gameState = 'victory';
    sound.playVictory();
    this.endMatch(true, undefined, 'Conquered 100% of the paper arena!');
  }

  private endMatchByTime() {
    const leaderboard = this.getLeaderboard();
    const isFirst = leaderboard[0]?.id === this.player.id;
    if (isFirst) {
      this.triggerVictory();
    } else {
      this.endMatch(false, leaderboard[0]?.name, 'Time expired in Rush Mode');
    }
  }

  private endMatch(isVictory: boolean, killerName?: string, reason?: string) {
    this.gameState = isVictory ? 'victory' : 'gameover';
    const leaderboard = this.getLeaderboard();
    const rank = leaderboard.findIndex((e) => e.id === this.player.id) + 1;

    const stats: MatchStats = {
      percentage: this.player.territoryPercentage,
      kills: this.player.kills,
      timeSurvivedSeconds: Math.floor(this.gameTimer),
      rank: rank || leaderboard.length,
      totalCompetitors: leaderboard.length,
      mode: this.gameMode,
      date: new Date().toLocaleDateString(),
      killerName,
      deathReason: reason || 'Eliminated',
      isVictory,
    };

    if (this.onGameOverCallback) {
      this.onGameOverCallback(stats);
    }
  }
}
