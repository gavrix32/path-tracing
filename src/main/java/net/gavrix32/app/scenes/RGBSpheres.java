package net.gavrix32.app.scenes;

import net.gavrix32.engine.graphics.Camera;
import net.gavrix32.engine.graphics.Material;
import net.gavrix32.engine.graphics.Scene;
import net.gavrix32.engine.graphics.Sky;
import net.gavrix32.engine.shapes.Box;
import net.gavrix32.engine.shapes.Plane;
import net.gavrix32.engine.shapes.Sphere;
import org.joml.Vector3f;
import org.joml.Vector4f;

public class RGBSpheres {
    public static Scene scene = new Scene(
            new Camera().setPos(50, 20, -80),
            new Plane(new Vector4f(0, 1, 0, 0), new Vector3f(1), new Material(0, 0), false),
            new Sky(new Vector3f(0)),
            new Sphere[] {
                    new Sphere(
                            new Vector3f(0, 20, 0),
                            new Vector3f(0),
                            new Vector3f(1, 0, 0),
                            new Material(1, 0), 20),
                    new Sphere(
                            new Vector3f(50, 20, 0),
                            new Vector3f(0),
                            new Vector3f(0, 1, 0),
                            new Material(1, 0), 20),
                    new Sphere(
                            new Vector3f(100, 20, 0),
                            new Vector3f(0),
                            new Vector3f(0, 0, 1),
                            new Material(1, 0), 20)
            },
            new Box[] {}
    );
}