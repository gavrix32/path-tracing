#version 460 core

out vec4 out_color;

#define PI 3.14159
#define EPSILON 0.001
#define MAX_DISTANCE 1e10
#define MAX_SPHERES 32
#define MAX_BOXES 32

struct Ray {
    vec3 origin, dir, invdir;
};

struct Material {
    vec3 color;
    bool is_metal;
    float emission;
    float roughness;
    bool is_glass;
    float IOR;
};

struct HitInfo {
    vec3 normal, hitpos;
    float distance;
    Material material;
};

struct Sphere {
    vec3 position;
    float radius;
    Material material;
};

struct Box {
    vec3 position, scale;
    mat4 rotation;
    Material material;
};

struct Triangle {
    vec3 v1, v2, v3;
};

struct Sky {
    Material material;
};

struct Plane {
    bool exists, checkerboard;
    float scale;
    vec3 color1, color2;
    Material material;
};

struct BoundingBox {
    vec3 min, max;
};

struct Node {
    BoundingBox bounds;
    float triangle_start_index, triangles_count, child_index;
};

uniform vec2 resolution;
uniform vec3 camera_position, prev_camera_position, triangles_offset;
uniform mat4 camera_rotation, prev_camera_rotation, triangles_rotation;
uniform int samples, bounces, spheres_count, boxes_count, accumulated_samples, max_accumulated_samples;
uniform bool temporal_reprojection, temporal_antialiasing, sky_has_texture;
uniform sampler2D sky_texture, prev_frame;
uniform float time, fov, focus_distance, aperture;
uniform Sphere spheres[MAX_SPHERES];
uniform Box boxes[MAX_BOXES];
uniform BoundingBox sph_bounds, box_bounds;
uniform Sky sky;
uniform Plane plane;

// Debug BVH
uniform bool debug_bvh;
uniform int bounds_test_threshold, triangle_test_threshold;

layout(binding = 0, rgba32f) uniform image2D normal_image;
layout(binding = 1, rgba32f) uniform image2D position_image;
layout(binding = 2, rgba32f) uniform image2D albedo_image;

layout(binding = 0) readonly buffer node_buffer {
    Node nodes[];
};

layout(binding = 1) readonly buffer triangle_buffer {
    Triangle triangles[];
};

float intersect_plane(Ray ray, vec4 p) {
    return -(dot(ray.origin, p.xyz) + p.w) / dot(ray.dir, p.xyz);
}

float intersect_sphere(Ray ray, vec3 ce, float ra) {
    vec3 oc = ray.origin - ce;
    float b = dot(oc, ray.dir);
    float c = dot(oc, oc) - ra * ra;
    float h = b * b - c;
    if (h < 0.0) return -1.0;
    return -b - sqrt(h);
}

float intersect_box(Ray ray, vec3 scale, out vec3 normal, mat4 rotation) {
    vec3 ro = (rotation * vec4(ray.origin, 1.0)).xyz;
    vec3 rd = (rotation * vec4(ray.dir, 0.0)).xyz;
    vec3 m = 1 / rd;
    vec3 n = m * ro;
    vec3 k = abs(m) * scale;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if (tN > tF || tF < 0.0) return -1.0;
    normal = (tN > 0.0) ? step(vec3(tN), t1) : step(t2, vec3(tF));
    normal *= -sign(rd);
    normal *= mat3(rotation);
    return tN;
}

float intersect_bounding_box(Ray ray, BoundingBox bounds) {
    vec3 tMin = (bounds.min - ray.origin) * ray.invdir;
    vec3 tMax = (bounds.max - ray.origin) * ray.invdir;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tFar = min(min(t2.x, t2.y), t2.z);
    float tNear = max(max(t1.x, t1.y), t1.z);
    if (tNear > tFar || tFar < 0.0) return -1.0;
    return tNear;
}

vec3 intersect_triangle(Ray ray, in vec3 v0, in vec3 v1, in vec3 v2, out vec3 normal/*, mat4 rotation*/) {
    /*vec3 ro = (rotation * vec4(ray.o, 1)).xyz;
    vec3 rd = (rotation * vec4(ray.d, 0)).xyz;*/
    vec3 ro = ray.origin;
    vec3 rd = ray.dir;
    vec3 v1v0 = v1 - v0;
    vec3 v2v0 = v2 - v0;
    vec3 rov0 = ro - v0;
    normal = cross(v1v0, v2v0);
    vec3 q = cross(rov0, rd);
    float d = 1.0 / dot(rd, normal);
    float u = d * dot(-q, v2v0);
    float v = d * dot(q, v1v0);
    float t = d * dot(-normal, rov0);
    if (u < 0.0 || v < 0.0 || (u + v) > 1.0) t = -1.0;
    if (dot(normal, rd) > 0.0) normal = -normal;
    //normal *= mat3(rotation);
    return vec3(t, u, v);
}

float checkerboard(vec2 p) {
    return mod(floor(p.x) + floor(p.y), 2.0);
}

// ray marching
/*float sdBox(vec3 p, vec3 b) {
    vec3 di = abs(p) - b;
    float mc = max(di.x, max(di.y, di.z));
    return min(mc, length(max(di, 0.0)));
}

float map(in vec3 p, out vec3 trap) {
    vec3 w = p;
    float m = dot(w, w);
    vec3 orbitTrap = vec3(1.);
    float dz = 1.0;
    for (int i = 0; i < 4; i++) {
        if (m > 1.2) break;
        float m2 = m * m;
        float m4 = m2 * m2;
        dz = 8.0 * sqrt(m4 * m2 * m) * dz + 1.0;
        float x = w.x; float x2 = x * x; float x4 = x2 * x2;
        float y = w.y; float y2 = y * y; float y4 = y2 * y2;
        float z = w.z; float z2 = z * z; float z4 = z2 * z2;
        float k3 = x2 + z2;
        float k2 = inversesqrt(k3 * k3 * k3 * k3 * k3 * k3 * k3);
        float k1 = x4 + y4 + z4 - 6.0 * y2 * z2 - 6.0 * x2 * y2 + 2.0 * z2 * x2;
        float k4 = x2 - y2 + z2;
        w.x = p.x +  64.0*x*y*z*(x2-z2)*k4*(x4-6.0*x2*z2+z4)*k1*k2;
        w.y = p.y + -16.0*y2*k3*k4*k4 + k1*k1;
        w.z = p.z +  -8.0*y*k4*(x4*x4 - 28.0*x4*x2*z2 + 70.0*x4*z4 - 28.0*x2*z2*z4 + z4*z4)*k1*k2;
        m = dot(w, w);
        orbitTrap = min(abs(w) * 1.2, orbitTrap);
    }
    trap = orbitTrap;
    return 0.25 * log(m) * sqrt(m) / dz;
}

float map(vec3 p) {
    float d = sdBox(p, vec3(100));
    return d;
}

float intersect(in vec3 ro, in vec3 rd, out vec3 trap) {
    float tmax = MAX_DISTANCE;
    float t = 0.01;
    vec3 orbitTrap;
    for (int i = 0; i < 128; i++ ) {
        float h = map(ro + rd * t, orbitTrap);
        if (h < 0.0001 || t > tmax) break;
        t += h;
    }
    trap = orbitTrap;
    return (t < tmax) ? t : -1.0;
}

vec3 calcNormal(in vec3 pos) {
    vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.0001;
    vec3 a;
    return normalize(e.xyy*map(pos + e.xyy, a) +
    e.yyx*map(pos + e.yyx, a) +
    e.yxy*map(pos + e.yxy, a) +
    e.xxx*map(pos + e.xxx, a) );
}*/
////////////////

int boundsTests = 0;
int triangleTests = 0;

bool raycast(in Ray ray, out HitInfo hitInfo) {
    hitInfo.distance = MAX_DISTANCE;
    bool hit = false;
    float dist;
    if (plane.exists) {
        dist = intersect_plane(ray, vec4(0.0, 1.0, 0.0, 0.0));
        if (dist > 0.0 && dist < hitInfo.distance) {
            hit = true;
            hitInfo.distance = dist;
            hitInfo.material = plane.material;
            hitInfo.normal = vec3(0.0, 1.0, 0.0);
            if (plane.checkerboard) {
                float cb = checkerboard(vec3(ray.dir * dist + ray.origin).xz / (plane.scale * 0.4f));
                if (cb != 0.0)
                    hitInfo.material.color = plane.color1;
                else
                    hitInfo.material.color = plane.color2;
            } else {
                hitInfo.material.color = plane.material.color;
            }
        }
    }
    dist = intersect_bounding_box(ray, sph_bounds);
    if (dist != -1.0 && dist < hitInfo.distance) {
        for (int i = 0; i < spheres_count; i++) {
            dist = intersect_sphere(ray, spheres[i].position, spheres[i].radius);
            if (dist > 0.0 && dist < hitInfo.distance) {
                hit = true;
                hitInfo.distance = dist;
                hitInfo.material = spheres[i].material;
                hitInfo.normal = normalize(ray.origin + ray.dir * dist - spheres[i].position);
            }
        }
    }
    dist = intersect_bounding_box(ray, box_bounds);
    if (dist != -1.0 && dist < hitInfo.distance) {
        for (int i = 0; i < boxes_count; i++) {
            vec3 normal;
            dist = intersect_box(Ray(ray.origin - boxes[i].position, ray.dir, ray.invdir), boxes[i].scale, normal, boxes[i].rotation).x;
            if (dist > 0.0 && dist < hitInfo.distance) {
                hit = true;
                hitInfo.distance = dist;
                hitInfo.material = boxes[i].material;
                hitInfo.normal = normalize(normal);
            }
        }
    }
    // BVH
    int stack[32];
    int index = 0;
    stack[index++] = 0;
    while (index > 0) {
        int nodeIndex = stack[--index];
        Node node = nodes[nodeIndex];
        if (node.child_index == 0) {
            for (int i = int(node.triangle_start_index); i < int(node.triangle_start_index + node.triangles_count); i++) {
                vec3 normal;
                Triangle tri = triangles[i];
                dist = intersect_triangle(ray, tri.v1, tri.v2, tri.v3, normal).x;
                triangleTests++;
                if (dist > 0 && dist < hitInfo.distance) {
                    hit = true;
                    hitInfo.distance = dist;
                    //hitInfo.material = Material(vec3(1.0, 0.5, 0.2), true, 0.0, 0.3, false, 0.0); // gold
                    hitInfo.material = Material(vec3(1.0), true, 0.0, 1.0, false, 0.0);
                    hitInfo.normal = normalize(normal);
                }
            }
        } else {
            int firstChildIndex = int(node.child_index);
            int secondChildIndex = int(node.child_index) + 1;
            Node firstChild = nodes[firstChildIndex];
            Node secondChild = nodes[secondChildIndex];

            float firstChildDist = intersect_bounding_box(ray, firstChild.bounds);
            float secondChildDist = intersect_bounding_box(ray, secondChild.bounds);
            boundsTests += 2;

            bool isNearestFirst = firstChildDist < secondChildDist;
            float distNear = isNearestFirst ? firstChildDist : secondChildDist;
            float distFar = isNearestFirst ? secondChildDist : firstChildDist;
            int childIndexNear = isNearestFirst ? firstChildIndex : secondChildIndex;
            int childIndexFar = isNearestFirst ? secondChildIndex : firstChildIndex;

            if (distFar != -1.0 && distFar < hitInfo.distance) stack[index++] = childIndexFar;
            if (distNear != -1.0 && distNear < hitInfo.distance) stack[index++] = childIndexNear;
        }
    }
    // ray marching
    /*vec3 trap;
    dist = intersect(ray.o, ray.d, trap);
    if (dist > 0 && dist < hitInfo.minDistance) {
        hit = true;
        hitInfo.minDistance = dist;
        hitInfo.material = Material(trap, true, 0, 0.3, false, 1);
        if (trap.r > 0.5 && trap.g > 0.5 && trap.b < 0.2) {
            hitInfo.material.emission = 10;
        } else if (trap.r < 0.2 && trap.g > 0.5 && trap.b < 0.2) {
            hitInfo.material.emission = 5;
        } else {
            hitInfo.material.color = vec3(1);
        }
        hitInfo.normal = calcNormal(ray.o + ray.d * dist);
    }*/
    ///////////////
    hitInfo.hitpos = ray.origin + ray.dir * hitInfo.distance;
    if (!hit) {
        hitInfo.material = sky.material;
        if (sky_has_texture) {
            vec2 uv_ = vec2(atan(ray.dir.z, ray.dir.x) / PI, asin(ray.dir.y) * 2.0 / PI);
            uv_ = uv_ * 0.5 + 0.5;
            hitInfo.material.color = texture(sky_texture, uv_).rgb;
        } else {
            hitInfo.material.color = sky.material.color;
        }
        return true;
    }
    return hit;
}

uint seed = 0;

// source: https://www.reedbeta.com/blog/hash-functions-for-gpu-rendering/
uint pcg_hash(uint seed) {
    uint state = seed * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

float random() {
    seed = pcg_hash(seed);
    return float(seed) * (1.0 / 4294967296.0);
}

vec3 random_cosine_weighted_hemisphere(vec3 normal) {
    float a = random() * 2.0 * PI;
    float z = random() * 2.0 - 1.0;
    float r = sqrt(1.0 - z * z);
    float x = r * cos(a);
    float y = r * sin(a);
    return normalize(normal + vec3(x, y, z));
}

void update_seed() {
    seed = pcg_hash(uint(gl_FragCoord.x));
    seed = pcg_hash(seed + uint(gl_FragCoord.y));
    seed = pcg_hash(seed + uint(time * 1000.0));
}

float fresnel(vec3 dir, vec3 n, float ior) {
    float cosi = dot(dir, n);
    float etai = 1.0;
    float etat = ior;
    if (cosi > 0.0) {
        float tmp = etai;
        etai = etat;
        etat = tmp;
    }
    float sint = etai / etat * sqrt(max(0.0, 1.0 - cosi * cosi));
    if (sint >= 1.0) return 1.0;
    float cost = sqrt(max(0.0, 1.0 - sint * sint));
    cosi = abs(cosi);
    float sqrtRs = ((etat * cosi) - (etai * cost)) / ((etat * cosi) + (etai * cost));
    float sqrtRp = ((etai * cosi) - (etat * cost)) / ((etai * cosi) + (etat * cost));
    return (sqrtRs * sqrtRs + sqrtRp * sqrtRp) / 2.0;
}

Ray brdf(Ray ray, HitInfo hitInfo) {
    if (hitInfo.material.is_glass)
        ray.origin += ray.dir * (hitInfo.distance + EPSILON);
    else
        ray.origin += ray.dir * (hitInfo.distance - EPSILON);
    vec3 diffused = random_cosine_weighted_hemisphere(hitInfo.normal);
    vec3 reflected = reflect(ray.dir, hitInfo.normal);
    vec3 refracted = refract(ray.dir, hitInfo.normal, 1.0 / hitInfo.material.IOR);
    if (hitInfo.material.is_glass) {
        if (fresnel(ray.dir, hitInfo.normal, hitInfo.material.IOR) > random()) refracted = reflected;
        if (hitInfo.material.is_metal)
            ray.dir = mix(refracted, diffused, hitInfo.material.roughness > 0.5 ? 0.5 : hitInfo.material.roughness);
        else
            ray.dir = mix(refracted, diffused, random() < hitInfo.material.roughness ? 1.0 : 0.0);
    } else {
        if (hitInfo.material.is_metal)
            ray.dir = mix(reflected, diffused, hitInfo.material.roughness);
        else
            ray.dir = mix(reflected, diffused, random() < hitInfo.material.roughness ? 1.0 : 0.0);
    }
    ray.invdir = 1.0 / ray.dir;
    return ray;
}

vec3 trace(Ray ray) {
    vec3 energy = vec3(1.0);
    for (int i = 0; i <= bounces; i++) {
        HitInfo hitinfo;
        if (raycast(ray, hitinfo)) {
            ray = brdf(ray, hitinfo);
            energy *= hitinfo.material.color;
            if (hitinfo.material.emission > 0.0)
                return energy * hitinfo.material.emission;
        }
    }
    return vec3(0);
}

vec2 uv2fragcoord(vec2 uv) {
    return vec2((uv * resolution.y + resolution) / 2.0);
}

vec2 reproject(mat3 prev_view, vec3 prev_cam_pos, HitInfo hitinfo, float fov_converted) {
    vec3 dir = (hitinfo.hitpos - prev_cam_pos) / hitinfo.distance;
    dir *= inverse(prev_view);
    dir.xy /= fov_converted * dir.z;
    return uv2fragcoord(dir.xy);
}

void main() {
    update_seed();
    //seed = pcg_hash(uint(gl_FragCoord.x * gl_FragCoord.y));

    vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
    float fov_converted = tan(radians(fov / 2.0));
    vec3 direction;

    // TAA
    if (temporal_antialiasing) {
        vec2 uv_jitter = uv;
        uv_jitter.x += (random() - 0.5) * 0.001;
        uv_jitter.y += (random() - 0.5) * 0.001;
        direction = normalize(vec3(uv_jitter * fov_converted, 1.0) * mat3(camera_rotation));
    } else {
        direction = normalize(vec3(uv * fov_converted, 1.0) * mat3(camera_rotation));
    }
    Ray ray = Ray(camera_position, direction, 1.0 / direction);

    // depth of field
    if (aperture != 0.0) {
        float focus_dist;
        if (focus_distance == 0.0) {
            HitInfo autofocus_hitinfo;
            vec3 dir = normalize(vec3(vec2(0.001), 1.0) * mat3(camera_rotation));
            Ray autofocus_ray = Ray(camera_position, dir, 1.0 / dir);
            raycast(autofocus_ray, autofocus_hitinfo);
            focus_dist = autofocus_hitinfo.distance >= MAX_DISTANCE ? 1000 : autofocus_hitinfo.distance;
        } else {
            focus_dist = focus_distance;
        }
        vec3 dof_position = (50.0 / aperture) * vec3(random_cosine_weighted_hemisphere(vec3(0)));
        vec3 dof_direction = normalize(ray.dir * focus_dist - dof_position);
        ray.origin += dof_position;
        ray.dir = normalize(dof_direction);
    }

    HitInfo hitinfo;
    vec3 dir = normalize(vec3(uv * fov_converted, 1.0) * mat3(camera_rotation));
    raycast(Ray(camera_position, dir, 1.0 / dir), hitinfo);

    vec3 color;
    for (int i = 0; i < samples; i++) {
        color += trace(ray);
    }
    color /= samples;

    if (debug_bvh) {
        float bounds_weight = boundsTests / float(bounds_test_threshold);
        float triangles_weight = triangleTests / float(triangle_test_threshold);
        //color = max(bounds_weight, triangles_weight) > 1.0 ? vec3(1.0) : vec3(triangles_weight, 0.0, bounds_weight);
        color = bounds_weight > 1.0 ? vec3(1.0, 0.0, 0.0) : vec3(bounds_weight);
    }

    float factor = accumulated_samples / (accumulated_samples + 1.0);
    if (temporal_reprojection) {
        vec2 reproj_fragcoord = reproject(mat3(prev_camera_rotation), prev_camera_position, hitinfo, fov_converted);
        vec2 reproj_uv = reproj_fragcoord / resolution;
        float temporal_mix_factor = 0.9;
        if (reproj_uv.x < 0.0 || reproj_uv.y < 0.0 || reproj_uv.x > 1.0 || reproj_uv.y > 1.0) {
            temporal_mix_factor = 0.0;
        }
        if (abs(hitinfo.distance - texture(prev_frame, reproj_uv).a) > 15.0) {
            temporal_mix_factor = 0.0;
        }
        vec3 prev_color = texture(prev_frame, reproj_uv).rgb;
        color = accumulated_samples != 0 ? mix(color, prev_color, factor == 0.0 ? temporal_mix_factor : factor) : mix(color, prev_color, temporal_mix_factor);
    }
    if (accumulated_samples != 0 && !temporal_reprojection) {
        vec3 prev_color = texture(prev_frame, gl_FragCoord.xy / resolution).rgb;
        color = accumulated_samples == max_accumulated_samples ? prev_color : mix(color, prev_color, factor);
    }

    imageStore(normal_image, ivec2(gl_FragCoord.xy), vec4(hitinfo.normal, 0.0));
    imageStore(position_image, ivec2(gl_FragCoord.xy), vec4(hitinfo.hitpos, 0.0));
    imageStore(albedo_image, ivec2(gl_FragCoord.xy), vec4(hitinfo.material.color, 0.0));

    out_color = vec4(color, hitinfo.distance);
}