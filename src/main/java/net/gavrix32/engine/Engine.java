package net.gavrix32.engine;

import net.gavrix32.engine.io.Window;
import net.gavrix32.engine.utils.Timer;

import static org.lwjgl.glfw.GLFW.*;

public class Engine {
    private static float dt;

    public static void run(IApp app) {
        app.init();
        while (!Window.isClosed()) {
            Timer frameTime = new Timer();
            frameTime.tick();
            app.update();
            dt = frameTime.getDelta();
        }
        glfwTerminate();
        System.exit(0);
    }

    public static float getDelta() {
        return dt;
    }
}