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
//end grid functions

renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// --- 1. Contrôles de Souris (Rotation) ---
// Permet à l'utilisateur de faire tourner la caméra/planète avec la souris
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Fluidité
controls.dampingFactor = 0.05;

// --- 2. Lumières ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
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

// --- 3. Création de la Planète texture ---
const radius = 5; // Rayon de la sphère
const textureLoader = new THREE.TextureLoader();

const planetTexture = textureLoader.load("./images/fun.jpg");
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

//grille wireframe auto
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

  // Optionnel : Faire tourner la planète automatiquement
  // (retirez si vous voulez seulement la rotation par l'utilisateur)
  planet.rotation.y += 0.001;

  // Animer les cubes marqueurs
  const time = Date.now() * 0.001;
  planet.children.forEach((child, index) => {
    if (child.userData && child.userData.isProject) {
      // Rotation continue du cube
      child.rotation.x += 0.01;
      child.rotation.y += 0.015;
      child.rotation.z += 0.005;

      // Effet de "flottement" (montée/descente subtile)
      const floatOffset = Math.sin(time * 2 + index) * 0.02;
      const basePosition = latLngToVector3(
        child.userData.lat || 0,
        child.userData.lng || 0,
        radius + child.geometry.parameters.width / 2
      );
      child.position.copy(basePosition.clone().multiplyScalar(1 + floatOffset));

      // Pulsation lumineuse
      child.material.emissiveIntensity = 0.3 + Math.sin(time * 3 + index) * 0.2;
    }
  });

  // Animer les lumières pour un effet dynamique
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

// Fonction pour créer un cube 3D marqueur
function createCubeMarker(
  lat,
  lng,
  radius,
  size,
  color,
  projectData,
  isEmpty = true
) {
  // Calculer la position 3D sur la sphère
  const position = latLngToVector3(lat, lng, radius + size / 2);

  // Créer la géométrie du cube
  const cubeGeometry = new THREE.BoxGeometry(size, size, size);

  let cubeMaterial;

  if (isEmpty) {
    // ✨ CUBE VIDE - wireframe seulement
    cubeMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      wireframe: true,
      metalness: 0.2,
      roughness: 0.3,
    });
  } else {
    // CUBE PLEIN - matériau solide
    cubeMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.4,
    });
  }

  // Créer le mesh du cube
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

  // Option: Ajouter des arêtes nettes pour les cubes vides
  if (isEmpty) {
    const edges = new THREE.EdgesGeometry(cubeGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 2,
    });
    const wireframeLines = new THREE.LineSegments(edges, edgeMaterial);
    cube.add(wireframeLines); // Ajouter les arêtes nettes au cube

    // 🧪 TEST: Zone de clic supprimée temporairement pour diagnostic
    const clickZoneGeometry = new THREE.BoxGeometry(
      size * 1.05,
      size * 1.05,
      size * 1.05
    );
    const clickZoneMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false,
    });
    const clickZone = new THREE.Mesh(clickZoneGeometry, clickZoneMaterial);
    cube.add(clickZone);
    console.log(`✅ Cube wireframe créé pour ${projectData.projectId}`);
  }

  // Positionner le cube
  cube.position.copy(position);
  // Orienter le cube pour qu'il "regarde" vers l'extérieur de la planète
  cube.lookAt(position.clone().multiplyScalar(2));

  // Ajouter des données pour l'interaction
  cube.name = projectData.projectId;
  cube.userData = {
    isProject: true,
    lat: lat,
    lng: lng,
    ...projectData,
  };

  return cube;
}

// Créer plusieurs cubes marqueurs à différentes positions
const markers = [
  {
    lat: -20,
    lng: 10,
    projectId: "Project-1",
    projectTitle: "Data Center Galactique",
    color: 0xff3333, // Rouge
    size: 0.25, // 🔍 Agrandi de 0.15 → 0.25 (+67%)
    isEmpty: true, // ✨ Cube vide (wireframe)
  },
  {
    lat: 45,
    lng: 2,
    projectId: "Project-2",
    projectTitle: "Site Web E-commerce",
    color: 0x33ff33, // Vert
    size: 0.22, // 🔍 Agrandi de 0.12 → 0.22 (+83%)
    isEmpty: true, // ✨ Cube vide (wireframe)
  },
  {
    lat: -35,
    lng: -60,
    projectId: "Project-3",
    projectTitle: "Application Mobile",
    color: 0x3333ff, // Bleu
    size: 0.28, // 🔍 Agrandi de 0.18 → 0.28 (+56%)
    isEmpty: true, // ✨ Cube vide (wireframe)
  },
  {
    lat: 35,
    lng: 120,
    projectId: "Project-4",
    projectTitle: "Portfolio Artistique",
    color: 0xffff33, // Jaune
    size: 0.24, // 🔍 Agrandi de 0.14 → 0.24 (+71%)
    isEmpty: true, // ✨ Cube vide (wireframe)
  },
];

// Créer et ajouter tous les cubes marqueurs
markers.forEach((markerData) => {
  const cube = createCubeMarker(
    markerData.lat,
    markerData.lng,
    radius,
    markerData.size,
    markerData.color,
    markerData,
    markerData.isEmpty // ✨ Passer le paramètre isEmpty
  );

  planet.add(cube); // Ajouté à la planète pour qu'il tourne avec elle
});

function onPlanetClick(event) {
  console.log("🖱️ Clic détecté !", event.clientX, event.clientY); // Debug avec position

  // 1. Convertir les coordonnées de la souris en coordonnées normalisées (-1 à 1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // 2. Mettre à jour le rayon avec la caméra et la position de la souris
  raycaster.setFromCamera(mouse, camera);

  // 3. Détecter les intersections - SEULEMENT les cubes marqueurs
  const allObjects = [];

  // Collecter uniquement les cubes et leurs enfants (wireframes, zones de clic)
  planet.children.forEach((child) => {
    if (child.userData && child.userData.isProject) {
      allObjects.push(child); // Le cube principal
      allObjects.push(...child.children); // Ses enfants (wireframe, zone de clic)
    }
  });

  const intersects = raycaster.intersectObjects(allObjects);
  console.log(
    `🎯 ${intersects.length} objets intersectés sur`,
    allObjects.length,
    "objets totaux"
  );

  // 🎯 SOLUTION: Filtrer les intersections trop lointaines et être plus strict
  const closeIntersects = intersects.filter((hit) => hit.distance < 4); // Seuil plus strict : 4 unités
  console.log(
    `📍 ${closeIntersects.length} objets proches (< 4 unités) sur ${intersects.length} total`
  );

  if (closeIntersects.length > 0) {
    // Grouper par projet parent pour éviter les doublons
    const projectHits = new Map();
    closeIntersects.forEach((hit) => {
      const parentName = hit.object.parent?.name;
      if (parentName && parentName.startsWith("Project-")) {
        if (
          !projectHits.has(parentName) ||
          hit.distance < projectHits.get(parentName).distance
        ) {
          projectHits.set(parentName, hit);
        }
      }
    });

    console.log(
      `🎯 Projets détectés: ${Array.from(projectHits.keys()).join(", ")}`
    );

    if (projectHits.size > 0) {
      // Prendre le projet le plus proche
      const closestHit = Array.from(projectHits.values()).sort(
        (a, b) => a.distance - b.distance
      )[0];
      console.log(
        `👆 Cube le plus proche: ${
          closestHit.object.parent?.name
        } à ${closestHit.distance.toFixed(2)} unités`
      );

      let marker = closestHit.object;

      // Si c'est un enfant d'un cube (wireframe ou zone de clic), prendre le parent
      if (
        !marker.userData?.isProject &&
        marker.parent &&
        marker.parent.userData?.isProject
      ) {
        marker = marker.parent;
        console.log("🔄 Redirection vers le cube parent");
      }

      console.log(
        `🎯 Objet cliqué: ${marker.name || "inconnu"}, isProject: ${
          marker.userData?.isProject
        }`
      ); // Debug

      // VÉRIFICATION : Assurez-vous que l'objet a les infos du projet (userData)
      if (marker.userData && marker.userData.isProject) {
        console.log(`Cube cliqué : ${marker.userData.projectTitle}`);

        // Effet visuel temporaire sur le cube cliqué
        const originalScale = marker.scale.clone();
        marker.scale.multiplyScalar(1.5); // Agrandir temporairement

        setTimeout(() => {
          marker.scale.copy(originalScale); // Revenir à la taille normale
        }, 300);

        // Lancer l'animation de zoom !
        zoomToMarker(marker);
      }
    }
  }
}

// Gestion du clic
window.addEventListener("click", onPlanetClick, false);

// Gestion du survol pour changer le curseur
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Utiliser la même logique que pour les clics - seulement les cubes
  const allObjects = [];
  planet.children.forEach((child) => {
    if (child.userData && child.userData.isProject) {
      allObjects.push(child);
      allObjects.push(...child.children);
    }
  });

  const intersects = raycaster.intersectObjects(allObjects);

  // Même filtre de distance pour le survol - plus strict
  const closeIntersects = intersects.filter((hit) => hit.distance < 4);

  if (closeIntersects.length > 0) {
    let marker = closeIntersects[0].object;
    if (
      !marker.userData?.isProject &&
      marker.parent &&
      marker.parent.userData?.isProject
    ) {
      marker = marker.parent;
    }

    if (marker.userData && marker.userData.isProject) {
      document.body.style.cursor = "pointer"; // Curseur main
      return;
    }
  }

  document.body.style.cursor = "default"; // Curseur normal
}

window.addEventListener("mousemove", onMouseMove, false);

// 🎮 RACCOURCI CLAVIER : Appuyez sur 'R' ou 'Échap' pour revenir au zoom par défaut
window.addEventListener(
  "keydown",
  function (event) {
    // Touche 'R' ou 'r' pour "Reset"
    if (event.key.toLowerCase() === "r" || event.key === "Escape") {
      console.log(`🎮 Raccourci clavier détecté: ${event.key}`);
      zoomToDefault();
      event.preventDefault(); // Empêcher le comportement par défaut
    }
  },
  false
);

// Fonction pour animer le zoom vers un marqueur
// Fonction pour revenir au zoom par défaut
function zoomToDefault() {
  console.log("🔄 Retour au zoom par défaut...");

  // Position par défaut de la caméra (même que l'initialisation)
  const defaultPosition = { x: 0, y: 0, z: 10 };

  // Animation fluide vers la position par défaut
  gsap.to(camera.position, {
    x: defaultPosition.x,
    y: defaultPosition.y,
    z: defaultPosition.z,
    duration: 1.2, // Un peu plus rapide que le zoom sur cube
    ease: "power2.inOut",
    onUpdate: function () {
      // S'assurer que la caméra regarde toujours le centre
      controls.target.copy(planet.position);
      controls.update();
    },
    onComplete: function () {
      // Réactiver les contrôles une fois le retour terminé
      controls.enabled = true;
      console.log("✅ Retour au zoom par défaut terminé !");
    },
  });
}

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
      const projectInfo = `
🎯 Projet : ${marker.userData.projectTitle}
📍 ID : ${marker.userData.projectId}
🌍 Position : ${marker.userData.lat}°, ${marker.userData.lng}°
🎨 Couleur : ${marker.material.color.getHexString()}
      `;

      // Proposer le retour automatique avec instructions
      const userChoice = confirm(
        `Zoom terminé!\n${projectInfo}\n\n✅ Cliquez OK pour revenir au zoom par défaut\n❌ Cliquez Annuler pour rester sur le cube\n\n💡 Astuce: Appuyez sur 'R' ou 'Échap' pour revenir rapidement au zoom par défaut`
      );

      if (userChoice) {
        // L'utilisateur veut revenir au zoom par défaut
        zoomToDefault();
      } else {
        // L'utilisateur veut rester zoomé sur le cube
        setTimeout(() => {
          controls.enabled = true;
        }, 500);
      }
    },
  });
}
