package net.gavrix32.app.scenes;

import net.gavrix32.engine.graphics.Camera;
import net.gavrix32.engine.graphics.Material;
import net.gavrix32.engine.graphics.Scene;
import net.gavrix32.engine.shapes.Box;
import net.gavrix32.engine.shapes.Sphere;
import org.joml.Vector3f;

public class CornellBox {
    private final Scene scene;

    public CornellBox() {
        scene = new Scene();
        scene.setCamera(new Camera().setPos(50, 80, -99));
        scene.setSky("textures/sky/quarry_cloudy_4k.hdr");
        scene.addBoxes(
                new Box(new Vector3f(50, 100, 100), // Front wall
                        new Vector3f(0, 0, 0),
                        new Vector3f(1, 1, 1),
                        new Material(true, 0, 1, 1),
                        new Vector3f(100, 100, 0)),
                new Box(new Vector3f(50, 100, -100), // Back wall
                        new Vector3f(0, 0, 0),
                        new Vector3f(1, 1, 1),
                        new Material(true, 0, 1, 1),
                        new Vector3f(100, 100, 0)),
                new Box(new Vector3f(-50, 100, 0), // Left wall
                        new Vector3f(0, 0, 0),
                        new Vector3f(1, 0, 0),
                        new Material(true, 0, 1, 1),
                        new Vector3f(0, 100, 100)),
                new Box(new Vector3f(150, 100, 0), // Right wall
                        new Vector3f(0, 0, 0),
                        new Vector3f(0, 1, 0),
                        new Material(true, 0, 1, 1),
                        new Vector3f(0, 100, 100)),
                new Box(new Vector3f(50, 200, 0), // Roof
                        new Vector3f(0, 0, 0),
                        new Vector3f(1, 1, 1),
                        new Material(true, 0, 1, 1),
                        new Vector3f(100, 0, 100)),
                new Box(new Vector3f(50, 0, 0), // Floor
                        new Vector3f(0, 0, 0),
                        new Vector3f(1, 1, 1),
                        new Material(true, 0, 1, 1),
                        new Vector3f(100, 0, 100)),
                new Box(new Vector3f(50, 199.999f, 0), // Light
                        new Vector3f(0, 0, 0),
                        new Vector3f(1, 1, 1),
                        new Material(true, 5, 1, 1),
                        new Vector3f(50, 0.1f, 50))

        );
        scene.addSpheres(
                new Sphere(
                        new Vector3f(0, 20, 0),
                        new Vector3f(0, 0, 0),
                        new Vector3f(1),
                        new Material(true, 0, 1, 1), 20),
                new Sphere(
                        new Vector3f(50, 20, 0),
                        new Vector3f(0, 0, 0),
                        new Vector3f(1),
                        new Material(true, 0, 0.5f, 1), 20),
                new Sphere(
                        new Vector3f(100, 20, 0),
                        new Vector3f(0, 0, 0),
                        new Vector3f(1),
                        new Material(true, 0, 0, 1), 20)
        );
    }
    public Scene getScene() {
        return scene;
    }
}