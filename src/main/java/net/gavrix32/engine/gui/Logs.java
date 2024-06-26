package net.gavrix32.engine.gui;

import imgui.ImGui;
import imgui.flag.ImGuiWindowFlags;
import net.gavrix32.engine.utils.Logger;

public class Logs {
    public static void update() {
        ImGui.begin("Logs", ImGuiWindowFlags.NoMove);
        for (String msg : Logger.getLogList()) {
            if (msg.contains("[INFO]")) ImGui.text(msg);
            if (msg.contains("[WARNING]")) ImGui.textColored(1.0f, 1.0f, 0.0f, 1f, msg);
            if (msg.contains("[ERROR]")) ImGui.textColored(1.0f, 0.0f, 0.0f, 1f, msg);
        }
        // ImGui.setScrollHereY(1.0f);
        ImGui.end();
    }
}