/**
 * EasyMap Logic - Control de Mapa Interactivo
 * Ubicación: components/map-logic.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar si el contenedor del mapa existe
    const mapContainer = document.getElementById('map');
    const coordsDisplay = document.getElementById('coords');

    if (!mapContainer) {
        console.error("Error: No se encontró el contenedor con id 'map'");
        return;
    }

    // 2. Inicializar el mapa (Tijuana, BC)
    const tijuanaCoords = [32.5149, -117.0382];
    const map = L.map('map', {
        zoomControl: false,
    }).setView(tijuanaCoords, 13);

    // 3. Capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // --- NUEVA FUNCIONALIDAD: GUARDAR PUNTOS ---

    let tempMarker = null;

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
            <button id="btn-confirm-save" class="bg-green-500 text-white px-4 py-1 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors">
                Confirmar
            </button>
        `;

        tempMarker.bindPopup(popupContent).openPopup();

        // 3. Manejar el clic en el botón de confirmación
        // Usamos setTimeout para asegurar que el DOM del popup esté listo
        setTimeout(() => {
            document.getElementById('btn-confirm-save')?.addEventListener('click', () => {
                saveLocation(lat, lng);
            });
        }, 10);
    });

    // --- FIN NUEVA FUNCIONALIDAD ---

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