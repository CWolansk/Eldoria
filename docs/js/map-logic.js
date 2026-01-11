// Shared logic for Eldoria maps

function initMap(config) {
    const { imagePath, markers } = config;
    
    // Initialize the map
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2
    });

    // Get image dimensions and set bounds
    const img = new Image();
    img.src = imagePath;
    
    img.onload = function() {
        const w = img.width;
        const h = img.height;
        
        // Set bounds based on image dimensions
        const bounds = [[0, 0], [h, w]];
        
        // Add the image overlay
        L.imageOverlay(imagePath, bounds).addTo(map);
        
        // Set the view to the center of the image
        map.fitBounds(bounds);
        
        // Add markers after the map is set up
        addMarkersToMap(map, markers, h, w);
        
        // Add coordinate display on click
        setupCoordinateDisplay(map, h, w);
    };
}

function setupCoordinateDisplay(map, height, width) {
    map.on('mousemove', function(e) {
        const y = e.latlng.lat;
        const x = e.latlng.lng;
        
        // Convert to percentage coordinates
        const yPercent = (y / height).toFixed(3);
        const xPercent = (x / width).toFixed(3);
        
        // Display coordinates
        const coordsOutput = document.getElementById('coords-output');
        if (coordsOutput) {
            coordsOutput.innerHTML = `[${yPercent}, ${xPercent}]`;
        }
    });

    // Add click listener to generate marker JSON (Shift + Click)
    map.on('click', function(e) {
        if (e.originalEvent.shiftKey) {
            const y = e.latlng.lat;
            const x = e.latlng.lng;
            
            // Convert to percentage coordinates
            const yPercent = (y / height).toFixed(3);
            const xPercent = (x / width).toFixed(3);

            const name = prompt("Enter location name:");
            if (!name) return;
            
            const link = prompt("Enter link path:", "Public/World/Unknown.html");
            if (link === null) return;

            const description = prompt("Enter description (optional):", "");
            if (description === null) return;

            // Get current filename to tell server which file to update
            const mapFilename = window.location.pathname.split('/').pop() || 'index.html';

            const markerData = {
                name: name,
                position: [parseFloat(yPercent), parseFloat(xPercent)],
                link: link,
                description: description,
                mapFilename: mapFilename
            };

            // Send to server
            fetch('/api/markers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(markerData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Marker saved successfully!');
                    // Add to map visually
                    addSingleMarker(map, markerData, height, width);
                } else {
                    alert('Error saving marker: ' + data.error);
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('Error saving marker. Make sure the Node.js server is running.');
                
                // Fallback to copy-paste if server fails
                const newMarker = `
                {
                    name: "${name}",
                    position: [${yPercent}, ${xPercent}],
                    link: "${link}",
                    description: "${description}"
                },`;
                prompt("Server unreachable. Copy this JSON instead:", newMarker);
            });
        }
    });
}

function addMarkersToMap(map, markers, height, width) {
    markers.forEach(marker => {
        addSingleMarker(map, marker, height, width);
    });
}

function addSingleMarker(map, marker, height, width) {
    const y = marker.position[0] * height;
    const x = marker.position[1] * width;
    
    const leafletMarker = L.marker([y, x]).addTo(map);
    
    // Create popup content
    const container = document.createElement('div');
    
    const h3 = document.createElement('h3');
    h3.textContent = marker.name;
    container.appendChild(h3);
    
    const p = document.createElement('p');
    p.textContent = marker.description;
    container.appendChild(p);
    
    const a = document.createElement('a');
    a.href = marker.link;
    a.target = "_blank";
    a.textContent = "View Notes";
    container.appendChild(a);

    const br = document.createElement('br');
    container.appendChild(br);
    
    const btn = document.createElement('button');
    btn.textContent = "Remove Marker";
    btn.style.color = "red";
    btn.style.marginTop = "10px";
    btn.style.fontSize = "0.8em";
    
    btn.onclick = function() {
        if(confirm(`Are you sure you want to remove "${marker.name}"?\n\nThis will permanently delete it from the file.`)) {
            // Get current filename
            const mapFilename = window.location.pathname.split('/').pop() || 'index.html';

            // Send delete request to server
            fetch('/api/markers', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: marker.name,
                    mapFilename: mapFilename
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    map.removeLayer(leafletMarker);
                    console.log(`Removed marker: ${marker.name}`);
                } else {
                    alert('Error removing marker: ' + data.error);
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('Error removing marker. Make sure the Node.js server is running.');
            });
        }
    };
    container.appendChild(btn);
    
    leafletMarker.bindPopup(container);
}
