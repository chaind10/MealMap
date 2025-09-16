import { createClient } from 'https://esm.sh/@supabase/supabase-js'
//import restaurantData from './JavaScript.js';
import { current } from './current.js'


// Create a single supabase client for interacting with your database (url and public anon key)
const supabase = createClient('https://ajdfffpuszisdfpwqrtn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZGZmZnB1c3ppc2RmcHdxcnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDE4NDQsImV4cCI6MjA3MjQxNzg0NH0.mzu_bF0KBqnjiTXr3KEZaveB9vDfpl7YFGd-_mqRou8', {
  auth: {
    persistSession: true,
    detectSessionInUrl: true

  }
})

const authBtn = document.getElementById('login')

function loadAuthButton(user) {
  if (user) {
    // if signed in, change the button to "Sign out"
    authBtn.textContent = 'Sign out'
    authBtn.onclick = async () => {
      authBtn.disabled = true
      try { await supabase.auth.signOut() }
      finally { authBtn.disabled = false }
      window.location.reload()//reload the page after sign-out
    }
  } else {
    // if signed out, change the button to "Sign in with Google"
    authBtn.textContent = 'Sign in with Google'
    // on click, sign in with Google
    authBtn.onclick = async () => {
      authBtn.disabled = true
      try {// redirect to Google sign-in page
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + "/RestarauntFinderProject/" }//redirect back to this page after sign-in
        })
        if (error) console.error(error)
      } finally {
        authBtn.disabled = false//reenable button after sign-in attempt
      }
    }
  }
}//end function loadAuthButton

// On page load


const { data: { session }, error: sessErr } = await supabase.auth.getSession()
if (sessErr) console.error(sessErr)
loadAuthButton(session?.user)

// React to future sign-in/sign-out
supabase.auth.onAuthStateChange((_event, session) => {
  loadAuthButton(session?.user)
})

// Check active session and get user data
const { data: { user } } = await supabase.auth.getUser()

const status = document.getElementById("status")

//checks if user is signed in and if so, logs their id and email and adds them to the profiles table in supabase
if (user) {

  status.textContent = `Signed in as ${user.email}`//display user's email on the page if signed in

  await supabase.from('profiles').upsert({//add user to profiles table if not already there
    id: user.id,
    email: user.email
  })

} else {//if not signed in
  console.log('Not signed in')
  status.textContent = `Not signed in`
}

const container = document.querySelector('.cards');

// Event delegation for save button clicks
container.addEventListener('click', async function (e) {
  const saveBtn = e.target.closest('.saveBtn')
  if (!saveBtn) return
  if (saveBtn.disabled) return
  saveBtn.disabled = true
  try {

    // retrieve current restaurant details
    const r = {
      id: current.restaurant.id,
      name: current.restaurant.name,
      photo: current.restaurant.photo
    }

    if (user) {
      // save to supabase table 'saved_places'
      await supabase
        .from('saved_places')
        .upsert(
          { user_id: user.id, place_id: r.id, name: r.name, photo: r.photo },
          { onConflict: 'user_id,place_id' }
        )

      // make the black heart turn green + animate
      saveBtn.classList.remove('btn--dark');
      saveBtn.classList.add('btn--success', 'pop');
      saveBtn.textContent = '♥';
      setTimeout(() => saveBtn.classList.remove('pop'), 300);


    }

    else {//if not signed in, alert user to sign in
      alert("Please sign in to save restaurants")
    }

  } finally {
    saveBtn.disabled = false
  }

})//end event listener for save button

//Event listener for show saved restaurants button
document.getElementById("showSaved").addEventListener("click", async function showSaved() {
  const container = document.querySelector('.cards');
  container.classList.add('grid');    // switch to grid view
  container.innerHTML = '<p>Loading…</p>';

  // fetch saved restaurants from supabase based on user id
  const { data: rows, error } = await supabase
    .from('saved_places')
    .select('place_id, name, photo, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!rows || rows.length === 0) {
    container.innerHTML = '<p>No saved restaurants yet</p>';
    return;
  }

  // display saved restaurants
  container.innerHTML = '';
  rows.forEach(restaurant => {
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`;
    const card = document.createElement('div');
    card.className = 'location-card';
    card.innerHTML = `
      <img src="${restaurant.photo}" alt="${restaurant.name}"/>
      <div class="card-body">
        <h3 class="card-title"><a href="${mapsUrl}" target="_blank" rel="noopener">${restaurant.name}</a></h3>
      </div>
      <div class="card-actions">
        <a class="btn btn--ghost btn--sm" href="${mapsUrl}" target="_blank" rel="noopener">View</a>
        <button class="btn btn--danger btn--sm remove" data-place-id="${restaurant.place_id}">Remove</button>
      </div>`;
    container.appendChild(card);
  });
});

container.addEventListener("click", async function removeCard(e) {
  const btn = e.target.closest('.remove');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();


  const placeId = btn.getAttribute('data-place-id');
  if (!placeId) return;

  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) { console.error(sessErr); return; }
  const user = session?.user;
  if (!user) { alert('Please sign in'); return; }

  // Disable button to prevent multiple clicks
  btn.disabled = true;
  try {
    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('user_id', user.id)
      .eq('place_id', placeId);

    // Re-enable button and remove card from UI
    if (error) { console.error(error); alert(error.message); return; }
    btn.closest('.location-card')?.remove();
  } catch (err) {
    console.error(err);
    btn.disabled = false;
  }

})  // delete from supabase