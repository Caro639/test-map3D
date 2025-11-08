// Configuration générale
const container = document.getElementById("planet-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

function createLatitudeLines(radius, count, color) {
  const lines = new THREE.Group();
  // Créer des lignes de latitude uniformément réparties
  for (let i = 1; i < count - 1; i++) {
    // Éviter les pôles
    const phi = (i / (count - 1)) * Math.PI - Math.PI / 2; // Angle de -90 à 90 degrés
    const y = radius * Math.sin(phi); // Hauteur du cercle (latitude)

    // Calculer le rayon de ce cercle (plus petit aux pôles)
    const currentRadius = radius * Math.cos(phi);

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      linewidth: 2, // Plus épais (ne fonctionne pas sur tous les navigateurs)
    });
    const points = [];
    const segments = 128; // Plus de segments pour des lignes plus lisses

    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2; // Angle de 0 à 360 degrés
      points.push(
        new THREE.Vector3(
          currentRadius * Math.cos(theta),
          y, // La hauteur reste constante pour cette latitude
          currentRadius * Math.sin(theta)
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    lines.add(line);
  }
  return lines;
}

function createLongitudeLines(radius, count, color) {
  const lines = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
  });
  const segments = 128; // Plus de segments pour des lignes plus lisses

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2; // Angle de rotation autour de l'axe Y

    const points = [];
    // Dessiner de -PI/2 (pôle sud) à PI/2 (pôle nord)
    for (let j = 0; j <= segments; j++) {
      const phi = (j / segments) * Math.PI - Math.PI / 2;
      points.push(
        new THREE.Vector3(
          0, // X sera transformé par la rotation
          radius * Math.sin(phi), // Y (latitude)
          radius * Math.cos(phi) // Z (profondeur)
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);

    // Rotation pour positionner le méridien
    line.rotation.y = theta;
    lines.add(line);
  }
  return lines;
}

//stopp code
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// --- 1. Contrôles de Souris (Rotation) ---
// Permet à l'utilisateur de faire tourner la caméra/planète avec la souris
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Fluidité
controls.dampingFactor = 0.05;

// --- 2. Lumières ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Lumière globale plus faible
scene.add(ambientLight);

// Lumière directionnelle principale (simule le soleil)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// Lumière ponctuelle colorée pour l'effet spatial
const pointLight = new THREE.PointLight(0x4444ff, 0.8, 50);
pointLight.position.set(-10, 5, 10);
scene.add(pointLight);

// Deuxième lumière ponctuelle violette (assortie à vos grilles)
const pointLight2 = new THREE.PointLight(0xad45c6, 0.6, 30);
pointLight2.position.set(5, -8, -5);
scene.add(pointLight2);

// --- 3. Création de la Planète ---
const radius = 5; // Rayon de la sphère
const textureLoader = new THREE.TextureLoader();

// CHARGEZ VOTRE IMAGE ICI
const planetTexture = textureLoader.load("fun.jpg");
// const planetTexture = textureLoader.load("maps.webp");

const geometry = new THREE.SphereGeometry(radius, 64, 64); // Sphère
const material = new THREE.MeshStandardMaterial({
  map: planetTexture,
  emissive: 0x111122, // Légère émission bleutée
  emissiveIntensity: 0.1, // Faible intensité pour un effet subtil
});

const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// Créer une atmosphère lumineuse autour de la planète
const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.05, 64, 64);
const atmosphereMaterial = new THREE.MeshBasicMaterial({
  color: 0x4444ff,
  transparent: true,
  opacity: 0.15,
  side: THREE.BackSide, // Visible de l'intérieur
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// Création et ajout des grilles de latitude et longitude
const latitudeGrid = createLatitudeLines(5, 24, 0xad45c6); // 24 lignes de latitude
scene.add(latitudeGrid);

const longitudeGrid = createLongitudeLines(5, 36, 0xad45c6); // 36 lignes de longitude
scene.add(longitudeGrid);

//grille wireframe
// Utiliser la même géométrie, mais avec un rayon légèrement plus grand pour le faire "flotter" un peu au-dessus de la texture
// const wireframeRadius = radius * 1.005; // Léger agrandissement
// const wireframeGeometry = new THREE.SphereGeometry(wireframeRadius, 64, 64);

// const wireframeMaterial = new THREE.MeshBasicMaterial({
//   color: 0xad45c6, // Couleur de la grille
//   wireframe: true,
//   transparent: true, // Pour permettre la transparence
//   opacity: 0.5, // Ajustez l'opacité pour voir la texture en dessous
// });

// const wireframeGlobe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
// scene.add(wireframeGlobe);

// Position initiale de la caméra
camera.position.z = 10;

// Outils nécessaires au Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ------------------------------------------
// --- 4. La Boucle d'Animation (Le Cœur) ---
// ------------------------------------------
function animate() {
  // Cette fonction est appelée 60 fois par seconde (environ)
  requestAnimationFrame(animate);

  // Mettre à jour les contrôles OrbitControls (essentiel pour la fluidité)
  controls.update();

  // Optionnel : Faire tourner la planète automatiquement (retirez si vous voulez seulement la rotation par l'utilisateur)
  planet.rotation.y += 0.001;

  // Animer les lumières pour un effet dynamique
  const time = Date.now() * 0.001;
  pointLight.intensity = 0.8 + Math.sin(time * 2) * 0.3; // Pulsation
  pointLight2.intensity = 0.6 + Math.cos(time * 1.5) * 0.2; // Pulsation décalée

  // Faire tourner les lumières autour de la planète
  pointLight.position.x = Math.cos(time * 0.5) * 15;
  pointLight.position.z = Math.sin(time * 0.5) * 15;

  // Dessiner la scène à l'écran
  renderer.render(scene, camera);
}

// Lancement de l'animation
animate();

// Gestion du redimensionnement de la fenêtre
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------
// --- 5. Placement d'un Marqueur (Test) ---
// ------------------------------------------

// Fonction pour convertir (Lat, Lng) en (X, Y, Z) 3D
function latLngToVector3(lat, lng, radius) {
  // Les mathématiques pour projeter une coordonnée sur une sphère
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Exemple: Placer le marqueur au "centre" de la galaxie (-20° Lat, 10° Lng)
const markerPosition = latLngToVector3(-20, 10, radius + 0.01);

// Création d'un point lumineux pour le marqueur
const markerGeometry = new THREE.SphereGeometry(0.1, 8, 8); // Très petit point
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Rouge vif
const marker = new THREE.Mesh(markerGeometry, markerMaterial);

marker.position.copy(markerPosition);
planet.add(marker); // Ajouté à la planète pour qu'il tourne avec elle
marker.name = "Project-1"; // Nom unique pour l'identification au clic

// Stocker des infos supplémentaires dans l'objet pour le Raycasting
marker.userData = {
  isProject: true,
  projectId: "Project-1",
  projectTitle: "Data Center Galactique",
};
function onPlanetClick(event) {
  // 1. Convertir les coordonnées de la souris en coordonnées normalisées (-1 à 1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // 2. Mettre à jour le rayon avec la caméra et la position de la souris
  raycaster.setFromCamera(mouse, camera);

  // 3. Détecter les intersections
  // 'planet.children' pour ne vérifier que les marqueurs (enfants de la planète)
  const intersects = raycaster.intersectObjects(planet.children);

  if (intersects.length > 0) {
    // Le premier élément touché est le plus proche de la caméra
    const marker = intersects[0].object;

    // VÉRIFICATION : Assurez-vous que l'objet a les infos du projet (userData)
    if (marker.userData && marker.userData.isProject) {
      console.log(`Projet cliqué : ${marker.userData.projectId}`);

      // Lancer l'animation de zoom !
      zoomToMarker(marker);
    }
  }
}

window.addEventListener("click", onPlanetClick, false);

// Fonction pour animer le zoom vers un marqueur
function zoomToMarker(marker) {
  // 1. Cible de la Caméra
  // On veut placer la caméra juste devant le marqueur.
  // Multiplier par 1.5 pour se positionner à 1.5 fois le rayon de la planète.
  const targetPosition = marker.position
    .clone()
    .normalize()
    .multiplyScalar(radius * 1.5);

  // 2. Animation de la position de la caméra
  // On anime les propriétés (x, y, z) de la caméra actuelle vers la nouvelle position
  gsap.to(camera.position, {
    x: targetPosition.x,
    y: targetPosition.y,
    z: targetPosition.z,
    duration: 1.5, // Durée de l'animation en secondes
    ease: "power2.inOut",
    onUpdate: function () {
      // S'assurer que la caméra regarde toujours le centre (la planète) pendant le mouvement
      controls.target.copy(planet.position);
      controls.update();
    },
    onComplete: function () {
      // Une fois le zoom terminé, désactiver les contrôles de rotation
      controls.enabled = false;

      // 💡 AFFICHAGE DES INFOS PROJET ICI
      // Exemple : afficher la sidebar d'informations du projet cliqué (via marker.userData.projectId)
      alert(`Zoom terminé sur le projet : ${marker.userData.projectTitle}`);

      // Réactiver les contrôles après un court délai ou au clic sur un bouton "Retour"
    },
  });
}
