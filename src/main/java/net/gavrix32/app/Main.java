package net.gavrix32.app;

import net.gavrix32.app.scenes.CornellBox;
import net.gavrix32.app.scenes.RGBSpheres;
import net.gavrix32.app.scenes.Spheres;
import net.gavrix32.engine.Engine;
import net.gavrix32.engine.IApplication;
import net.gavrix32.engine.Utils;
import net.gavrix32.engine.graphics.*;
import net.gavrix32.engine.io.*;

import java.nio.ByteBuffer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.lwjgl.glfw.GLFW.*;
import static org.lwjgl.opengl.GL46C.*;
import static org.lwjgl.stb.STBImage.*;

public class Main implements IApplication {
    private int texture;
    private Camera cam;

    @Override
    public void init() {
        Window.init("Ray Tracing", 1280, 720);
        //GLUtil.setupDebugMessageCallback();
        glfwSetKeyCallback(Window.get(), (window, key, scancode, action, mods) -> {
            if (key == GLFW_KEY_ESCAPE && action == GLFW_RELEASE) Window.close();
            if (key == GLFW_KEY_F11 && action == GLFW_RELEASE) Window.toggleFullscreen();
            if (key == GLFW_KEY_F1 && action == GLFW_RELEASE) GuiRenderer.toggle();
            if (key == GLFW_KEY_F2 && action == GLFW_RELEASE) {
                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH.mm.ss");
                LocalDateTime now = LocalDateTime.now();
                Utils.takeScreenshot("screenshots/" + dtf.format(now) + ".png");
            }
        });
        glfwSetMouseButtonCallback(Window.get(), (window, button, action, mods) -> {
            if (button == GLFW_MOUSE_BUTTON_2 && action == GLFW_RELEASE) Window.toggleCursor();
        });
        CornellBox.scene.getCamera().setPos(50, 50, -120);
        RGBSpheres.scene.getCamera().setPos(50, 20, -80);
        Spheres.scene.getCamera().setPos(50, 20, -80);
        Renderer.init();
        GuiRenderer.init();

        // Skybox
        texture = glGenTextures();
        glActiveTexture(GL_TEXTURE1);
        glBindTexture(GL_TEXTURE_CUBE_MAP, texture);
        glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        String[] skyBoxPaths = new String[] {
                "textures/skybox/iceriver/posx.jpg",
                "textures/skybox/iceriver/negx.jpg",
                "textures/skybox/iceriver/posy.jpg",
                "textures/skybox/iceriver/negy.jpg",
                "textures/skybox/iceriver/posz.jpg",
                "textures/skybox/iceriver/negz.jpg"
        };
        for (int i = 0; i < 6; i++) {
            int[] width = new int[1], height = new int[1];
            ByteBuffer data = null;
            data = stbi_load(Main.class.getClassLoader().getResource(skyBoxPaths[i]).getPath(), width, height,  new int[1], 3);
            // data = stbi_load_from_memory(ByteBuffer.wrap(Utils.loadBytes(skyBoxPaths[i])), width, height,  new int[1], 3);
            if (data == null) System.err.println("Failed to load texture: " + stbi_failure_reason());
            glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, GL_RGB, width[0], height[0], 0, GL_RGB, GL_UNSIGNED_BYTE, data);
        }
        // cam = new Camera();
        // cam.setPos(0, 200, -200);
    }

    @Override
    public void update() {
        Controls.update(CornellBox.scene.getCamera());
        Renderer.render(CornellBox.scene);
        /*Controls.update(cam);
        Renderer.render(new Scene(cam, new Sphere[0], new Box[0]));*/
        GuiRenderer.update();
        Window.update();
    }

    public static void main(String[] args) {
        Engine.run(new Main());
    }
}