package com.zenflow.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge layout — web content draws behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        // Hardware back button handler
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();

                // If the WebView has history to go back through, use it
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // No more history — notify the JS layer first
                    // so the React app can close modals, etc.
                    getBridge().eval(
                        "window.dispatchEvent(new CustomEvent('androidBackPressed'))",
                        null
                    );

                    // Give the JS layer 300ms to handle it,
                    // then finish the activity if still unhandled
                    new android.os.Handler(android.os.Looper.getMainLooper())
                        .postDelayed(() -> {
                            if (!isFinishing()) {
                                setEnabled(false);
                                getOnBackPressedDispatcher().onBackPressed();
                            }
                        }, 300);
                }
            }
        });
    }
}

