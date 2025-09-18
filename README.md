MealMap - Having trouble deciding where to take your hunger? Find the closest restaurants near you with just the click of a button!
Check it out: https://meal-map-brown.vercel.app

Features:
- Google Places Nearby Search
- Skip/Save with the click of a button
- Google Sign-in (authentication)
- Independent saves based on user
- Straight Line Distance Display
- Mobile-Friendly UI

Tech-Stack:
- JS, HTML, CSS, Google Places API, SupaBase (Auth, Postgres, RLS), Vercel

How it works:
1) Geolocation (with caching)
   - Requests users location from the browser (lat, lng) using "navigator.geolocation"
   - Caching "{lat, lng, timestamp}" in local storage for ~10 mins to avoid excess API calls and reprompting

2) Search for Nearby Restaurants + Data
   - Call Google Places API, (places: searchNearby) while filtering for only restaurants near the user (using the location pulled from the browser)
   - Google Places API returns data such as name, id, picture, type, and location of the restaurants
  
3) Calculating Distance (for display)
   - Using the Haversine Formula, the straight-line distance from each restaurant to the user's location is calculated and displayed
  
4) User Authentication
   - Using SupaBase, MealMap requires Google Sign-in to save any restaurants under the signed-in account
   - The users id and email are upserted into a table called profiles, the account is now recorded in the database
  
5) Saving Favourites
   - Pressing the save button upserts a row into saved_places (table) with user_id, place_id, name, and photo
   - This data is saved seperately based on user_id
  
6) Displaying Favourites
   - When clicking the "Show Saved Restaurants" button, the saved_places table is queried for the signed-in user's id and renders only the restaurants under that id
  
7) Row Level Security (RLS)
   - Supabase RLS policies only allow inserts and selects when user_id = auth.uid() is true
   - This ensures users can only read and write their own data

Screenshots:
<img width="1615" height="846" alt="image" src="https://github.com/user-attachments/assets/08a7ae1b-4405-43e3-bdbc-7903113ec704" />
<img width="1648" height="858" alt="image" src="https://github.com/user-attachments/assets/8676dac2-e569-4e7c-8a59-22e9a6431d7d" />

Environment and Security:
Google - Using Places API (New) | HTTP referrer restrictions applied to:
    - localhost
    - https://meal-map-brown.vercel.app
Supabase - Use anon key | RLS enabled |

Database & RLS:
- Tables: `profiles(id, email)` and `saved_places(id, user_id, place_id, name, photo, created_at)`
- Unique per user/place via `(user_id, place_id)` | RLS allows insert/select only when `user_id = auth.uid()`

