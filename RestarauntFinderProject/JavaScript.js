import { current } from './current.js'
const apiKey = "AIzaSyBu3UH7OR6RExfHjIE-GF-MIKfOVrKJc1I"

function distanceKm(lat1, lng1, lat2, lng2) {//Haversine formula to calculate distance between two lat/lng points in km (straight line distance not route distance)
  const R = 6371; // Earth radius in km
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}



document.getElementById("findRest").addEventListener("click", function getLocation() {//Function to get the users location
  const cache = JSON.parse(localStorage.getItem("cachedLocation") || '{}');//get the cached location if it exists (will be in JSON format)
  const now = Date.now();

  if (cache.timestamp && (now - cache.timestamp < 10 * 60 * 1000)) {//if there is a location that has been cached less than 10 minutes ago use that cached location
    useLocation(cache.lat, cache.lng);
  }
  else {//if there isnt a location that has been cached less than 10 minutes ago 
    navigator.geolocation.getCurrentPosition(pos => {//gets latitude and longitude of user
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      localStorage.setItem("cachedLocation", JSON.stringify({ lat, lng, timestamp: now }));//cache the location with a timestamp in JSON format
      useLocation(lat, lng);
    }, () => alert("Location access denied or is unavailable"));
  }
}//end function getLocation
)//end event listener

async function useLocation(lat, lng) {//Function to use the users location to get nearby restaurants in the Places API
  console.log("Using Location: ", lat, lng);

  const body = {//body of the POST request to the Places API
    includedTypes: ["restaurant"],
    maxResultCount: 20,
    locationRestriction: {// Restricting the search to a 10km radius around the user's location
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 10000.0
      }
    }
  };


  try {
    //Post request to the Places API
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.photos,places.primaryTypeDisplayName,places.types,places.location"
      },
      body: JSON.stringify(body)
    });//fetch request to the Places API

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status} - ${errText}`);
    }

    const data = await response.json();

    if (data.places && data.places.length) {//if there are places returned from the API, display them
      displayCards(data.places, lat, lng);
    }
    else {
      alert("No results found");//no places were found
    }
  } catch (e) {
    console.error("Error Fetching Places API");
    alert("Error fetching Restaurants");
  }
}//end function useLocation

// Event delegation for next button clicks
document.addEventListener('click', (e) => {

  //if not a next button, ignore
  const btn = e.target.closest('.nextBtn')
  if (!btn) return

  //if not inside a swipe wrapper, ignore
  const wrapper = btn.closest('.swipe-wrapper')
  if (!wrapper) return

  // animate out, then remove
  wrapper.style.transform = 'translateX(-150%) rotate(-15deg)'
  wrapper.style.opacity = 0
  setTimeout(() => {
    wrapper.remove()

    // update current to the new top card (if any)
    const container = document.querySelector('.cards')
    const nextWrapper = container.querySelector('.swipe-wrapper')
    if (nextWrapper) {
      current.restaurant = {
        id: nextWrapper.dataset.id,
        name: nextWrapper.dataset.name,
        photo: nextWrapper.dataset.photo
      }
    } else {
      current.restaurant = null
    }
  }, 100)
})

function displayCards(places, userLat, userLng) {//function to display the restaurant cards dynamically
  const container = document.querySelector('.cards');
container.classList.remove('grid');   // back to stacked swipe view
container.innerHTML = '';


  places.forEach((place, i) => {//loop through each place returned from the API
    const wrapper = document.createElement('div');
    wrapper.className = 'swipe-wrapper';
    wrapper.style.zIndex = 200 - i;

    const card = document.createElement('div');
    card.className = 'location-card';

    const photoName = place.photos?.[0]?.name;//get the photo name if it exists
    const imgUrl = photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${apiKey}`//construct the photo url using the photo name
      : 'https://via.placeholder.com/250x150?text=No+Image';//if no photo exists, use a placeholder image

    const restaurantData = {//object to hold restaurant data
      name: place.displayName?.text || 'Untitled',
      id: place.id,
      photo: imgUrl,
    };

    //Type of restaurant (e.g., Italian, Chinese, etc.)
    const type = place.primaryTypeDisplayName?.text || place.types?.[0] || 'Restaurant'

    //Setting up distance text
    const loc = place.location?.latLng ?? place.location;
    let distanceText = '';
    if (loc?.latitude != null && loc?.longitude != null) {
      const km = distanceKm(userLat, userLng, loc.latitude, loc.longitude);
      distanceText = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    }//display distance in meters if less than 1km, otherwise in km


    wrapper.dataset.id = restaurantData.id;
    wrapper.dataset.name = restaurantData.name;
    wrapper.dataset.photo = restaurantData.photo;

    if (i === 0) current.restaurant = restaurantData

    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.id}`;//get the url for the restaurant on Google Maps

    //load the card content for each restaurant
    card.innerHTML = `<div class="card-media">
    <img loading="lazy" src="${restaurantData.photo}" alt="${restaurantData.name}">
  </div>

  <div class="card-body">
    <h3 class="card-title">${restaurantData.name}</h3>
    <p class="card-subtitle">
      ${type}${distanceText ? ' • ' + distanceText + ' away' : ''}
    </p>
  </div>

  <div class="card-actions">
    <button class="btn btn--danger nextBtn" aria-label="Skip">✕</button>
    <a class="btn btn--ghost" href="${mapsUrl}" target="_blank" rel="noopener">View</a>
    <button class="btn btn--dark saveBtn" aria-label="Save">♡</button>
  </div>`;

    wrapper.appendChild(card);
    container.appendChild(wrapper);

  });//end loop through places

}//end function displayCards