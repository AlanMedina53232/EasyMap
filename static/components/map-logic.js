/**
 * EasyMap Logic - Control de Mapa Interactivo
 * Ubicación: components/map-logic.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // ========== GESTIÓN DE PESTAÑAS (MÓVIL) ==========
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y contenidos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Agregar clase active al botón y contenido seleccionado
            btn.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // ========== INICIALIZACIÓN DEL MAPA ==========
    const mapContainer = document.getElementById('map');
    const coordsDisplay = document.getElementById('coords');
    const placesListContent = document.getElementById('places-list-content');

    if (!mapContainer) {
        console.error("Error: No se encontró el contenedor con id 'map'");
        return;
    }

    // Inicializar el mapa (Tijuana, BC)
    const tijuanaCoords = [32.5149, -117.0382];
    const map = L.map('map', {
        zoomControl: false,
    }).setView(tijuanaCoords, 13);

    // Capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Control de zoom con aria-labels
    const zoomControl = L.control.zoom({ position: 'bottomright' });
    zoomControl.addTo(map);

    // Agregar atributos aria-label a los botones de zoom después de que se cargue el mapa
    map.on('load', () => {
        const zoomInBtn = document.querySelector('.leaflet-control-zoom-in');
        const zoomOutBtn = document.querySelector('.leaflet-control-zoom-out');
        
        if (zoomInBtn) {
            zoomInBtn.setAttribute('aria-label', 'Acercar mapa');
            zoomInBtn.setAttribute('title', 'Acercar mapa');
        }
        if (zoomOutBtn) {
            zoomOutBtn.setAttribute('aria-label', 'Alejar mapa');
            zoomOutBtn.setAttribute('title', 'Alejar mapa');
        }
    });

    // Ejecutar también después de un pequeño delay en caso de que sea necesario
    setTimeout(() => {
        const zoomInBtn = document.querySelector('.leaflet-control-zoom-in');
        const zoomOutBtn = document.querySelector('.leaflet-control-zoom-out');
        
        if (zoomInBtn) {
            zoomInBtn.setAttribute('aria-label', 'Acercar mapa');
            zoomInBtn.setAttribute('title', 'Acercar mapa');
        }
        if (zoomOutBtn) {
            zoomOutBtn.setAttribute('aria-label', 'Alejar mapa');
            zoomOutBtn.setAttribute('title', 'Alejar mapa');
        }
    }, 500);

    // ========== NUEVA FUNCIONALIDAD: GUARDAR PUNTOS ==========

    let tempMarker = null;
    let savedPlaces = []; // Almacenar lugares guardados

    /**
     * Crea una notificación visual sutil (Toast)
     */
    const showToast = (message, isError = false) => {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[2000] px-6 py-3 rounded-full text-white text-sm font-bold shadow-2xl transition-all duration-500 ${isError ? 'bg-red-500' : 'bg-zinc-800'}`;
        toast.innerText = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    /**
     * Actualiza la lista de lugares en la interfaz
     */
    const updatePlacesList = () => {
        if (savedPlaces.length === 0) {
            placesListContent.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m0 0h6"></path>
                    </svg>
                    <p class="text-sm">Haz clic en el mapa para agregar lugares</p>
                </div>
            `;
        } else {
            placesListContent.innerHTML = savedPlaces.map((place, index) => `
                <div class="place-item" role="listitem">
                    <strong>Punto ${index + 1}</strong><br>
                    Lat: ${place.lat}<br>
                    Long: ${place.lng}
                </div>
            `).join('');
        }
    };

    /**
     * Envía las coordenadas al servidor Flask
     */
    const saveLocation = async (lat, lng) => {
        showToast("Guardando punto...");
        
        try {
            const response = await fetch('/guardar_punto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });

            if (response.ok) {
                showToast("¡Punto guardado con éxito!");
                if (tempMarker) tempMarker.closePopup();
                
                // Agregar lugar a la lista
                savedPlaces.push({
                    lat: lat.toFixed(4),
                    lng: lng.toFixed(4)
                });
                updatePlacesList();
            } else {
                throw new Error("Error en el servidor");
            }
        } catch (error) {
            console.error(error);
            showToast("Error al conectar con el servidor", true);
        }
    };

    // Evento de clic en el mapa
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;

        // Remover marcador temporal previo si existe
        if (tempMarker) map.removeLayer(tempMarker);

        // 1. Poner marcador temporal inmediatamente
        tempMarker = L.marker([lat, lng]).addTo(map);

        // 2. Abrir popup con pregunta y botón de confirmación
        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 text-center';
        popupContent.innerHTML = `
            <p class="font-bold mb-2">¿Guardar este punto?</p>
            <button id="btn-confirm-save" class="bg-green-500 text-white px-4 py-1 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors" aria-label="Confirmar guardado de punto">
                Confirmar
            </button>
        `;

        tempMarker.bindPopup(popupContent).openPopup();

        // 3. Manejar el clic en el botón de confirmación
        setTimeout(() => {
            document.getElementById('btn-confirm-save')?.addEventListener('click', () => {
                saveLocation(lat, lng);
            });
        }, 10);
    });

    // ========== FIN NUEVA FUNCIONALIDAD ==========

    // HUD de coordenadas
    map.on('move', () => {
        const center = map.getCenter();
        if (coordsDisplay) {
            coordsDisplay.innerText = `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`;
        }
    });

    // Ajuste de renderizado inicial
    setTimeout(() => map.invalidateSize(), 200);
    window.addEventListener('resize', () => map.invalidateSize());
});