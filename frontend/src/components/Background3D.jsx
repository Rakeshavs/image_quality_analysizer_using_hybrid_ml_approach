import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Background3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050b14, 0.0016);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 180;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Floating Particle Constellation (Electric Cyan & Sapphire Palette - NO PURPLE)
    const particleCount = 1100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0x00f2fe), // Electric Cyan
      new THREE.Color(0x38bdf8), // Sapphire / Sky Blue
      new THREE.Color(0x0284c7), // Deep Ocean Blue
      new THREE.Color(0x7dd3fc), // Ice Blue
      new THREE.Color(0x06b6d4), // Cyan Glow
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 400;
      positions[idx + 1] = (Math.random() - 0.5) * 300;
      positions[idx + 2] = (Math.random() - 0.5) * 300;

      velocities[idx] = (Math.random() - 0.5) * 0.07;
      velocities[idx + 1] = (Math.random() - 0.5) * 0.07;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.07;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture creator
    const createParticleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(0,242,254,0.8)');
      grad.addColorStop(0.6, 'rgba(2,132,199,0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
      return new THREE.CanvasTexture(canvas);
    };

    const particleMaterial = new THREE.PointsMaterial({
      size: 3.4,
      vertexColors: true,
      map: createParticleTexture(),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // 5. 3D Floating Geometric Wireframe Objects (Electric Cyan & Sapphire)
    const geoGroup = new THREE.Group();

    // Dodecahedron
    const dodecaGeo = new THREE.IcosahedronGeometry(24, 1);
    const dodecaMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const dodecaMesh = new THREE.Mesh(dodecaGeo, dodecaMat);
    dodecaMesh.position.set(-120, 45, -50);
    geoGroup.add(dodecaMesh);

    // Torus Knot
    const torusGeo = new THREE.TorusKnotGeometry(18, 2.5, 96, 16);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const torusMesh = new THREE.Mesh(torusGeo, torusMat);
    torusMesh.position.set(125, -40, -40);
    geoGroup.add(torusMesh);

    // Octahedron
    const octaGeo = new THREE.OctahedronGeometry(16, 0);
    const octaMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const octaMesh = new THREE.Mesh(octaGeo, octaMat);
    octaMesh.position.set(0, 75, -80);
    geoGroup.add(octaMesh);

    scene.add(geoGroup);

    // 6. Interactive Mouse Physics Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.15;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.15;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 7. Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX * 0.3;
      camera.position.y = -targetY * 0.3;
      camera.lookAt(scene.position);

      dodecaMesh.rotation.x = elapsedTime * 0.12;
      dodecaMesh.rotation.y = elapsedTime * 0.18;

      torusMesh.rotation.x = elapsedTime * 0.15;
      torusMesh.rotation.z = elapsedTime * 0.10;

      octaMesh.rotation.y = elapsedTime * 0.20;
      octaMesh.rotation.z = elapsedTime * 0.15;

      const posAttr = geometry.attributes.position;
      const posArr = posAttr.array;

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;

        posArr[idx] += velocities[idx];
        posArr[idx + 1] += velocities[idx + 1];
        posArr[idx + 2] += velocities[idx + 2];

        if (Math.abs(posArr[idx]) > 250) velocities[idx] *= -1;
        if (Math.abs(posArr[idx + 1]) > 200) velocities[idx + 1] *= -1;
        if (Math.abs(posArr[idx + 2]) > 200) velocities[idx + 2] *= -1;
      }

      posAttr.needsUpdate = true;
      particles.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
