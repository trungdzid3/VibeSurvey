package com.vibesurvey.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity - Điểm khởi động Android Native cho ứng dụng VibeSurvey
 * Tích hợp Capacitor Bridge kết nối Web SPA và Native Haptics / Network
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Khởi tạo các plugin bổ trợ nếu cần thiết
    }
}
