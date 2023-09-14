'use strict';

// --------------Parent Class--------------
class Workout {
  date = new Date();
  // 一般來說我們做一個id，會用第三方的id生產器幫我們做，這邊我們先用日期取後面10碼
  id = (Date.now() + '').slice(-10); // +'' 會把date 轉換成 string
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January','February', 'March','April','May','June','July','August','September','October','November', 'December',
    ];

    // Marker 的敘述、list 的敘述
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
// --------------Child Class--------------
class Running extends Workout {
  // prop availble for all instances
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration); // init the this keyword
    this.cadence = cadence;
    // 利用constructor 特性讓我馬上執行這個method
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  // prop availble for all instances
  type = 'cycling'; // 也可以放在constructor :this.type = 'cycling'
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration); // init the this keyword
    this.elevationGain = elevationGain;
    // 利用constructor 特性讓我馬上執行這個method
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// // -----------測試看看-----------
// // coords, km, min, cadence/elevG
// const run1 = new Running([39, -12], 5.2, 24, 170);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1); // 可以看到[[Prototype]]裡面有他們class的method , ex: clacSpeed, calcPace

////////////////////////////////////////////

// Application architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  // 當新的物件從App這個class建立時，constructor method 會馬上被呼叫
  constructor() {
    // get user's position
    this._getPosition();
    // get data from local storage
    this._getLocalStorage();

    // -------Event handlers--------
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      // bind 回傳一個函式
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(
      `https://www.google.com.tw/maps/@${latitude},120.7089699,${longitude}`
    ); // 取得現在地圖位址

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // console.log(this); // undefined!! why?
    // 因為this._loadMap 被當作regular function 呼叫而不是method , 被當method呼叫才會有this可以用，反之則this undefined

    this.#map.on('click', this._showForm.bind(this));
    console.log(this);

    // 要知道marker必須要在map load完之後才能貼上去
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    console.log(mapE);
    this.#mapEvent = mapE;
    console.log(this.#mapEvent);
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    // ----helper function ----
    // check if 是個數字
    const validInputs = (
      ...inputs // (括號中用rest給我陣列)
    ) => inputs.every(inp => Number.isFinite(inp));
    // check if 數字正數
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // string -> number !!!
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // 注意：Modern JS 比較少用if else 而是這樣分開寫兩個if
    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      // Guard Clause (去檢驗如果發生預期之外的事情則立馬回傳不再繼續執行)
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');
      // 當驗證通過後 做一個running obj
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling , create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout); // 這邊的this是我們自己叫自己的method 不需要再用bind重新導向this

    // Render workout on list
    this._renderWorkout(workout);

    // Hid form + clear input fileds
    this._hideForm();

    // Set local Storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords, { riseOnHover: true }) // position.coords回傳經緯度
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`, // 使用Child calss 的public field
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴🏻‍♂️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
  <div class="left">
      <h2 class="workout__title">${workout.description}
    </h2>

      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴🏻‍♂️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      </div>
      <div class="right">
      <div class="CRUD">
     
      <div class="edit">edit</div>
      <div class="delete">x</div>
      </div>

      
      
    `;
    if (workout.type === 'running')
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
  </div>
</li>
`;
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
    </div>

  </li>
`;
    form.insertAdjacentHTML('afterend', html); // add as a sibling after form
  }
  _moveToPopup(e) {
    // event delegation: 不管點擊到div, span都會往上去找到 class 是 workout的人 -> 取得id
    const clickedEl = e.target;
    const workoutEl = clickedEl.closest('.workout');
    if (!workoutEl) return; // guard class
    if (clickedEl.matches('.delete')) {
      return this._deleteWorkout(workoutEl);
    }
    if (clickedEl.matches('.edit')) this._editWorkokut(workoutEl);
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // leaflet 的 method
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using the public interface
    // workout.click();
  }
  _setLocalStorage() {
    // key/value(string)
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // guard clause
    if (!data) return;

    this.#workouts = data; // 要知道的是 因為我在一開始constructor就已經呼叫這個函式所以空陣列會直接方入這個data

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workout');
    // 重整頁面
    location.reload();
  }

  _deleteWorkout(workout) {
    console.log('deleted');
    console.log(workout);
    console.log(this.#workouts);

    const workoutId = workout.getAttribute('data-id');
    console.log(workoutId);

    this.#workouts = this.#workouts.filter(w => w.id !== workoutId);
    console.log(this.#workouts);

    // this.#workouts.pop(workout);
    this._setLocalStorage();
    workout.remove();
  }
  _editWorkokut(workout) {
    console.log('edit');
    this._deleteWorkout(workout);
    this._showForm();
  }
}

const app = new App();
