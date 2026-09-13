package com.matterborn.game;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebSettings settings = this.bridge.getWebView().getSettings();
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
        } catch (Exception ignored) {}
    }
}
