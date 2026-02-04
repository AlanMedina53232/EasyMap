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
    let savedMarkers = []; // Almacenar referencias a los marcadores
    
    // ========== SISTEMA DE RUTAS ==========
    let routeMode = false; // Modo de cálculo de ruta activado/desactivado
    let routeStartIndex = null; // Índice del punto de inicio
    let routeEndIndex = null; // Índice del punto de destino
    let currentRouteControl = null; // Control de ruta actual de Leaflet
    let currentRouteLine = null; // Línea de ruta directa de respaldo
    let routeTimeoutId = null; // ID del timeout para poder cancelarlo

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
            placesListContent.innerHTML = savedPlaces.map((place, index) => {
                // Asegurar que las coordenadas se muestren correctamente
                const displayLat = typeof place.lat === 'number' ? place.lat.toFixed(4) : place.lat;
                const displayLng = typeof place.lng === 'number' ? place.lng.toFixed(4) : place.lng;
                
                return `
                <div class="place-item ${index === routeStartIndex ? 'route-start' : ''} ${index === routeEndIndex ? 'route-end' : ''}" role="listitem" data-index="${index}">
                    <strong>Punto ${index + 1}</strong>
                    ${index === routeStartIndex ? '<span class="text-xs text-green-700"> (Inicio)</span>' : ''}
                    ${index === routeEndIndex ? '<span class="text-xs text-red-700"> (Destino)</span>' : ''}
                    <br>
                    Lat: ${displayLat}<br>
                    Long: ${displayLng}
                </div>
            `;
            }).join('');
            
            // Agregar eventos de clic a cada item de la lista
            document.querySelectorAll('.place-item').forEach(item => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.getAttribute('data-index'));
                    
                    // Si estamos en modo ruta, seleccionar puntos
                    if (routeMode) {
                        handleRoutePointSelection(index);
                    } else {
                        // Modo normal: flyTo al marcador
                        const place = savedPlaces[index];
                        const marker = savedMarkers[index];
                        
                        map.flyTo([place.lat, place.lng], 16, {
                            duration: 1.5,
                            easeLinearity: 0.25
                        });
                        
                        if (marker) {
                            setTimeout(() => marker.openPopup(), 1000);
                        }
                    }
                });
            });
        }
    };

    /**
     * Envía las coordenadas al servidor Flask
     */
    const saveLocation = async (lat, lng) => {
        console.log('📤 Iniciando guardado de punto:', lat, lng);
        showToast("Guardando punto...");
        
        try {
            const response = await fetch('/guardar_punto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });

            console.log('📥 Respuesta del servidor:', response.status, response.ok);

            if (response.ok) {
                showToast("¡Punto guardado con éxito!");
                console.log('✅ Punto guardado exitosamente');
                
                if (tempMarker) tempMarker.closePopup();
                
                // Convertir el marcador temporal en permanente con color rojo
                if (tempMarker) {
                    map.removeLayer(tempMarker);
                }
                
                // Crear marcador permanente con icono rojo para mejor contraste
                const redIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                
                const permanentMarker = L.marker([lat, lng], { icon: redIcon }).addTo(map);
                permanentMarker.bindPopup(`<strong>Punto Guardado</strong><br>Lat: ${lat.toFixed(4)}<br>Long: ${lng.toFixed(4)}`);
                
                // Agregar lugar a la lista y marcador al array
                // Guardar como números para evitar problemas con el routing
                savedPlaces.push({
                    lat: parseFloat(lat.toFixed(4)),
                    lng: parseFloat(lng.toFixed(4))
                });
                savedMarkers.push(permanentMarker);
                console.log('📍 Lugar agregado. Total de lugares:', savedPlaces.length);
                updatePlacesList();
            } else {
                throw new Error("Error en el servidor: " + response.status);
            }
        } catch (error) {
            console.error('❌ Error al guardar punto:', error);
            showToast("Error al conectar con el servidor", true);
        }
    };

    // Evento de clic en el mapa
    map.on('click', (e) => {
        console.log('🖱️ Clic en mapa detectado. Modo ruta:', routeMode);
        
        // Si estamos en modo ruta, no permitir agregar nuevos puntos
        if (routeMode) {
            console.log('⚠️ Modo ruta activado, selecciona puntos de la lista');
            showToast('Selecciona puntos de la lista para la ruta', true);
            return;
        }
        
        const { lat, lng } = e.latlng;
        console.log('📍 Marcando punto en:', lat, lng);

        // Remover marcador temporal previo si existe
        if (tempMarker) map.removeLayer(tempMarker);

        // 1. Poner marcador temporal inmediatamente con color amarillo para indicar pendiente
        const yellowIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
        tempMarker = L.marker([lat, lng], { icon: yellowIcon }).addTo(map);

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
            const confirmBtn = document.getElementById('btn-confirm-save');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    console.log('✅ Guardando punto...');
                    saveLocation(lat, lng);
                });
            } else {
                console.error('❌ Botón de confirmación no encontrado');
            }
        }, 10);
    });

    // ========== FIN NUEVA FUNCIONALIDAD ==========

    // ========== FUNCIONALIDAD DE CÁLCULO DE RUTAS ==========

    const routeControlPanel = document.getElementById('route-control');
    const routeModeBtn = document.getElementById('route-mode-btn');
    const cancelRouteBtn = document.getElementById('cancel-route-btn');
    const routeInstruction = document.getElementById('route-instruction');
    const routeInfoPanel = document.getElementById('route-info');
    const routeDistanceEl = document.getElementById('route-distance');
    const routeTimeEl = document.getElementById('route-time');

    /**
     * Activa el modo de cálculo de ruta
     */
    const activateRouteMode = () => {
        if (savedPlaces.length < 2) {
            showToast('Necesitas al menos 2 puntos guardados para calcular una ruta', true);
            return;
        }
        
        routeMode = true;
        routeStartIndex = null;
        routeEndIndex = null;
        routeControlPanel.classList.remove('hidden');
        routeModeBtn.classList.add('opacity-50');
        routeModeBtn.disabled = true;
        routeInstruction.innerHTML = 'Selecciona el <strong>punto de inicio</strong> haciendo clic en un lugar de la lista o en el mapa';
        routeInfoPanel.classList.add('hidden');
        updatePlacesList();
    };

    /**
     * Cancela el modo de ruta
     */
    const cancelRouteMode = () => {
        console.log('🛑 Cancelando modo ruta...');
        routeMode = false;
        routeStartIndex = null;
        routeEndIndex = null;
        routeControlPanel.classList.add('hidden');
        routeModeBtn.classList.remove('opacity-50');
        routeModeBtn.disabled = false;
        
        // Limpiar ruta del mapa
        if (currentRouteControl) {
            map.removeControl(currentRouteControl);
            currentRouteControl = null;
        }
        
        // Limpiar línea directa si existe
        if (currentRouteLine) {
            map.removeLayer(currentRouteLine);
            if (currentRouteLine.shadowLine) {
                map.removeLayer(currentRouteLine.shadowLine);
            }
            currentRouteLine = null;
        }
        
        console.log('✅ Modo ruta cancelado. routeMode:', routeMode);
        showToast('Modo ruta desactivado. Ahora puedes guardar puntos haciendo clic en el mapa.');
        updatePlacesList();
    };

    /**
     * Maneja la selección de puntos para la ruta
     */
    const handleRoutePointSelection = (index) => {
        if (routeStartIndex === null) {
            // Seleccionar punto de inicio
            routeStartIndex = index;
            routeInstruction.innerHTML = 'Ahora selecciona el <strong>punto de destino</strong>';
            updatePlacesList();
        } else if (routeEndIndex === null && index !== routeStartIndex) {
            // Seleccionar punto de destino
            routeEndIndex = index;
            calculateRoute();
        } else if (index === routeStartIndex) {
            showToast('No puedes usar el mismo punto como inicio y destino', true);
        }
    };

    /**
     * Calcula distancia en línea recta entre dos puntos (fórmula de Haversine)
     */
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance;
    };

    /**
     * Dibuja una línea recta entre dos puntos
     */
    const drawDirectLine = (startLat, startLng, endLat, endLng) => {
        // Limpiar línea anterior
        if (currentRouteLine) {
            map.removeLayer(currentRouteLine);
            if (currentRouteLine.shadowLine) {
                map.removeLayer(currentRouteLine.shadowLine);
            }
        }
        
        // Dibujar línea de sombra primero (efecto de profundidad como Google Maps)
        const shadowLine = L.polyline(
            [[startLat, startLng], [endLat, endLng]],
            {
                color: '#1e40af',
                weight: 8,
                opacity: 0.15,
                lineCap: 'round',
                lineJoin: 'round'
            }
        ).addTo(map);
        
        // Dibujar línea principal con estilo similar a Google Maps
        currentRouteLine = L.polyline(
            [[startLat, startLng], [endLat, endLng]],
            {
                color: '#2563eb',
                weight: 5,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round'
            }
        ).addTo(map);
        
        // Guardar referencia a la línea de sombra para poder limpiarla después
        currentRouteLine.shadowLine = shadowLine;
        
        // Calcular distancia y tiempo estimado
        const distance = calculateDistance(startLat, startLng, endLat, endLng);
        const timeMin = Math.round(distance / 0.8); // Estimado: 50 km/h promedio
        
        // Mostrar información
        routeDistanceEl.textContent = `${distance.toFixed(2)} km`;
        routeTimeEl.textContent = `~${timeMin} min`;
        routeInfoPanel.classList.remove('hidden');
        routeInstruction.innerHTML = '✅ <strong>Ruta directa calculada</strong> (línea punteada) - Distancia en línea recta';
        
        // Ajustar vista del mapa
        map.fitBounds([[startLat, startLng], [endLat, endLng]], { padding: [50, 50] });
        
        showToast(`Ruta directa: ${distance.toFixed(2)} km`);
    };

    /**
     * Calcula y muestra la ruta entre dos puntos
     */
    const calculateRoute = async () => {
        const start = savedPlaces[routeStartIndex];
        const end = savedPlaces[routeEndIndex];
        
        routeInstruction.innerHTML = '🔄 Calculando ruta óptima...';
        
        // Limpiar ruta anterior si existe
        if (currentRouteControl) {
            map.removeControl(currentRouteControl);
            currentRouteControl = null;
        }
        
        if (currentRouteLine) {
            map.removeLayer(currentRouteLine);
            if (currentRouteLine.shadowLine) {
                map.removeLayer(currentRouteLine.shadowLine);
            }
            currentRouteLine = null;
        }
        
        // Asegurar que las coordenadas son números
        const startLat = typeof start.lat === 'number' ? start.lat : parseFloat(start.lat);
        const startLng = typeof start.lng === 'number' ? start.lng : parseFloat(start.lng);
        const endLat = typeof end.lat === 'number' ? end.lat : parseFloat(end.lat);
        const endLng = typeof end.lng === 'number' ? end.lng : parseFloat(end.lng);
        
        // Validar coordenadas
        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
            showToast('Error: Coordenadas inválidas', true);
            routeInstruction.innerHTML = 'Error: Coordenadas inválidas. Intenta guardar los puntos nuevamente.';
            return;
        }
        
        console.log('🗺️ Calculando ruta desde', startLat, startLng, 'hasta', endLat, endLng);
        
        // Usar API de OSRM directamente con fetch
        try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
            console.log('🌐 URL OSRM:', osrmUrl);
            
            const response = await fetch(osrmUrl);
            console.log('📡 Respuesta status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Datos recibidos:', data);
            
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error('No se encontró ruta');
            }
            
            const route = data.routes[0];
            const geometry = route.geometry;
            
            // Convertir coordenadas de GeoJSON [lng, lat] a Leaflet [lat, lng]
            const latlngs = geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            console.log('📍 Total de puntos en la ruta:', latlngs.length);
            
            // Dibujar sombra (borde)
            const shadowLine = L.polyline(latlngs, {
                color: '#1e40af',
                weight: 8,
                opacity: 0.15,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);
            
            // Dibujar línea principal de la ruta
            currentRouteLine = L.polyline(latlngs, {
                color: '#2563eb',
                weight: 5,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);
            
            currentRouteLine.shadowLine = shadowLine;
            
            // Obtener distancia y duración
            const distanceKm = (route.distance / 1000).toFixed(2);
            const timeMin = Math.round(route.duration / 60);
            
            // Mostrar información
            routeDistanceEl.textContent = `${distanceKm} km`;
            routeTimeEl.textContent = `${timeMin} min`;
            routeInfoPanel.classList.remove('hidden');
            routeInstruction.innerHTML = '✅ <strong>Ruta por carretera calculada</strong> - Siguiendo calles y avenidas';
            
            updatePlacesList();
            
            // Ajustar zoom para mostrar toda la ruta
            map.fitBounds(currentRouteLine.getBounds(), { padding: [50, 50] });
            
            showToast(`✅ Ruta de ${distanceKm} km calculada`);
            
        } catch (error) {
            console.error('❌ Error al calcular ruta:', error);
            
            // Respaldo: mostrar línea recta
            showToast('⚠️ Servicio de rutas no disponible. Mostrando distancia directa.', true);
            
            const distance = calculateDistance(startLat, startLng, endLat, endLng);
            
            // Sombra
            const shadowLine = L.polyline(
                [[startLat, startLng], [endLat, endLng]],
                {
                    color: '#ef4444',
                    weight: 8,
                    opacity: 0.15,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '10, 10'
                }
            ).addTo(map);
            
            // Línea principal (roja y punteada para indicar que es aproximada)
            currentRouteLine = L.polyline(
                [[startLat, startLng], [endLat, endLng]],
                {
                    color: '#ef4444',
                    weight: 5,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '10, 10'
                }
            ).addTo(map);
            
            currentRouteLine.shadowLine = shadowLine;
            
            const timeMin = Math.round((distance / 50) * 60);
            
            routeDistanceEl.textContent = `${distance.toFixed(2)} km`;
            routeTimeEl.textContent = `~${timeMin} min`;
            routeInfoPanel.classList.remove('hidden');
            routeInstruction.innerHTML = '⚠️ <strong>Distancia en línea recta</strong> - Servicio de rutas temporalmente no disponible';
            
            map.fitBounds([[startLat, startLng], [endLat, endLng]], { padding: [50, 50] });
            updatePlacesList();
        }
    };

    // Event listeners para botones de ruta
    if (routeModeBtn) {
        console.log('✅ Botón de ruta encontrado, agregando listener');
        routeModeBtn.addEventListener('click', activateRouteMode);
    } else {
        console.error('❌ Botón de ruta NO encontrado');
    }
    
    if (cancelRouteBtn) {
        console.log('✅ Botón cancelar encontrado, agregando listener');
        cancelRouteBtn.addEventListener('click', cancelRouteMode);
    } else {
        console.error('❌ Botón cancelar NO encontrado');
    }

    // ========== FIN FUNCIONALIDAD DE RUTAS ==========

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