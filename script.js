const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const toggle = document.getElementById('toggle');
const mobileToggle = document.getElementById('mobile-menu-toggle');
const menuBackdrop = document.getElementById('menu-backdrop');
const mobileViewport = window.matchMedia('(max-width: 760px)');
toggle.setAttribute('aria-expanded', String(!mobileViewport.matches));

function setMobileMenuOpen(isOpen) {
  sidebar.classList.toggle('mobile-open', isOpen);
  menuBackdrop.hidden = !isOpen;
  mobileToggle.setAttribute('aria-expanded', String(isOpen));
  mobileToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  toggle.setAttribute('aria-expanded', String(isOpen));
}

toggle.addEventListener('click', () => {
  if (mobileViewport.matches) {
    setMobileMenuOpen(!sidebar.classList.contains('mobile-open'));
    return;
  }

  sidebar.classList.toggle('hide');
  content.classList.toggle('expand');
  toggle.setAttribute('aria-expanded', String(!sidebar.classList.contains('hide')));
});

mobileToggle.addEventListener('click', () => setMobileMenuOpen(true));
menuBackdrop.addEventListener('click', () => setMobileMenuOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
    setMobileMenuOpen(false);
    mobileToggle.focus();
  }
});

document.querySelectorAll('.sidebar .nav-link').forEach((link) => {
  link.addEventListener('click', () => window.showPage(link.dataset.page, link));
});

mobileViewport.addEventListener('change', (event) => {
  setMobileMenuOpen(false);
  toggle.setAttribute('aria-expanded', String(!event.matches && !sidebar.classList.contains('hide')));
});

window.showPage = function (id, element) {
  const pages = document.querySelectorAll('.page');
  pages.forEach((page) => page.classList.remove('active'));

  const targetPage = document.getElementById(id);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  const links = document.querySelectorAll('.sidebar .nav-link');
  links.forEach((link) => {
    link.removeAttribute('aria-current');
    link.closest('li').classList.remove('active');
  });

  if (element) {
    element.setAttribute('aria-current', 'page');
    element.closest('li').classList.add('active');
  }

  if (mobileViewport.matches) {
    setMobileMenuOpen(false);
  }
};

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'XXXXXXXX',
  appId: 'XXXXXXXX',
};

const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => {
  if (typeof value !== 'string') return false;
  const cleaned = value.trim();
  return cleaned !== '' && !cleaned.startsWith('YOUR_') && !cleaned.includes('XXXXXXXX');
});

let db = null;
let firebaseReady = false;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseReady = true;
    console.log('Firebase connected successfully.');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else {
  console.warn('Firebase is not configured yet. The site is running in local demo mode.');
}

function getStoredReviews() {
  try {
    const savedReviews = JSON.parse(localStorage.getItem('portfolioReviews') || '[]');
    return Array.isArray(savedReviews) ? savedReviews : [];
  } catch (error) {
    console.error('Could not read local reviews:', error);
    return [];
  }
}

function saveReviewLocally(review) {
  const reviews = getStoredReviews();
  const newReview = {
    ...review,
    created: review.created instanceof Date ? review.created.toISOString() : new Date().toISOString(),
  };

  reviews.unshift(newReview);
  localStorage.setItem('portfolioReviews', JSON.stringify(reviews));
}

function renderReviews(reviews) {
  const reviewsContainer = document.getElementById('reviews');
  reviewsContainer.innerHTML = '';

  if (!reviews.length) {
    reviewsContainer.innerHTML = '<p>No reviews yet. Be the first to leave feedback!</p>';
    return;
  }

  reviews.forEach((data) => {
    const cleanName = data.name || 'Anonymous';
    const score = Number.parseInt(data.rating, 10) || 0;
    const cleanMessage = data.message || '';

    reviewsContainer.innerHTML += `
      <div class="review">
        <h3>${cleanName}</h3>
        <p style="color: #f39c12; margin: 0.25rem 0;">${'★'.repeat(score)}</p>
        <p>${cleanMessage}</p>
      </div>
    `;
  });
}

let rating = 0;
const stars = document.querySelectorAll('.star');

stars.forEach((star) => {
  star.onclick = () => {
    rating = Number(star.dataset.value);
    stars.forEach((s) => s.classList.remove('active'));

    for (let i = 0; i < rating; i += 1) {
      stars[i].classList.add('active');
    }
  };
});

async function loadReviews() {
  const reviewsContainer = document.getElementById('reviews');
  reviewsContainer.innerHTML = '<p>Loading reviews...</p>';

  if (!firebaseReady || !db) {
    renderReviews(getStoredReviews());
    return;
  }

  try {
    const q = query(collection(db, 'reviews'), orderBy('created', 'desc'));
    const snapshot = await getDocs(q);
    const reviews = [];

    snapshot.forEach((doc) => {
      reviews.push(doc.data());
    });

    if (!reviews.length) {
      const localReviews = getStoredReviews();
      renderReviews(localReviews);
      return;
    }

    renderReviews(reviews);
  } catch (error) {
    console.error('Error reading collection:', error);
    const localReviews = getStoredReviews();
    renderReviews(localReviews.length ? localReviews : []);

    if (!localReviews.length) {
      reviewsContainer.innerHTML = '<p>Reviews are temporarily unavailable. Please try again later.</p>';
    }
  }
}

document.getElementById('submitBtn').onclick = async () => {
  const name = document.getElementById('name').value.trim();
  const message = document.getElementById('message').value.trim();

  if (rating === 0) {
    alert('Please select a star rating first!');
    return;
  }

  const reviewData = {
    name: name || 'Anonymous',
    message,
    rating: Number(rating),
    created: new Date(),
  };

  try {
    if (firebaseReady && db) {
      await addDoc(collection(db, 'reviews'), reviewData);
    } else {
      saveReviewLocally(reviewData);
    }

    document.getElementById('name').value = '';
    document.getElementById('message').value = '';
    rating = 0;
    stars.forEach((star) => star.classList.remove('active'));

    await loadReviews();
    alert('Thank you for your feedback!');
  } catch (error) {
    console.error('Error writing review:', error);
    saveReviewLocally(reviewData);
    await loadReviews();
    alert('Your feedback was saved locally because the Firebase backend is currently unavailable.');
  }
};

loadReviews();
