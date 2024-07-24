package net.gavrix32.app;

import net.gavrix32.app.scenes.*;
import net.gavrix32.engine.Engine;
import net.gavrix32.engine.IApp;
import net.gavrix32.engine.graphics.*;
import net.gavrix32.engine.io.*;

import java.util.ArrayList;

public class Main implements IApp {
    private final ArrayList<Scene> scenes = new ArrayList<>();
    private CornellBox cornellBox;
    private RGBRoom rgbRoom;
    private RGBSpheres rgbSpheres;
    private Spheres spheres;
    private Liminal liminal;
    private OpenBox openBox;
    private BVHTest bvhTest;

    public void init() {
        Window.init();
        Window.setFullscreen(true);

        //GLUtil.setupDebugMessageCallback();
        cornellBox = new CornellBox();
        scenes.add(cornellBox.getScene());

        rgbRoom = new RGBRoom();
        scenes.add(rgbRoom.getScene());

        rgbSpheres = new RGBSpheres();
        scenes.add(rgbSpheres.getScene());

        spheres = new Spheres();
        scenes.add(spheres.getScene());

        liminal = new Liminal();
        scenes.add(liminal.getScene());

        openBox = new OpenBox();
        scenes.add(openBox.getScene());

        bvhTest = new BVHTest();
        scenes.add(bvhTest.getScene());

        // Material texture
        //
        // 0 ---- X
        // emission
        //
        // -1 --------- 0 --------- 1
        // plastic -- mirror -- metal

        Renderer.init();
    }

    public void update() {
        Controls.update();
        Renderer.render();
        Gui.update(scenes);
        Window.update();
    }

    public static void main(String[] args) {
        Engine.run(new Main());
    }
}