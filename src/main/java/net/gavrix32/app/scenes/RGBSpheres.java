package net.gavrix32.app.scenes;

import net.gavrix32.engine.graphics.Camera;
import net.gavrix32.engine.graphics.Material;
import net.gavrix32.engine.graphics.Scene;
import net.gavrix32.engine.graphics.Sky;
import net.gavrix32.engine.math.Vec3;
import net.gavrix32.engine.shapes.Box;
import net.gavrix32.engine.shapes.Sphere;

public class RGBSpheres {
    public static Scene scene = new Scene(
            new Camera().setPos(50, 20, -80),
            new Sky(new Vec3(0)),
            new Sphere[] {
                    new Sphere(new Vec3(0, 20, 0),
                            new Vec3(0),
                            new Vec3(1, 0, 0),
                            new Material(1, 0), 20),
                    new Sphere(new Vec3(50, 20, 0),
                            new Vec3(0),
                            new Vec3(0, 1, 0),
                            new Material(1, 0), 20),
                    new Sphere(new Vec3(100, 20, 0),
                            new Vec3(0),
                            new Vec3(0, 0, 1),
                            new Material(1, 0), 20)
            },
            new Box[] {}
    );
}
