// State
let allPrices = [];
let allRecipes = [];
let currentProfile = 'all';
let personCount = 1;
let isLuxury = false;

// Selectors
const calculateBtn = document.getElementById('calculateBtn');
const budgetInput = document.getElementById('budgetInput');
const resultsArea = document.getElementById('resultsArea');
const profileBtns = document.querySelectorAll('.profile-btn');
const statusBadge = document.getElementById('data-status');
const tickerContent = document.getElementById('tickerContent');
const personDisplay = document.getElementById('personCount');
const luxuryToggle = document.getElementById('luxuryToggle');

// Init
async function init() {
    try {
        await loadData();
        renderTicker();
        statusBadge.textContent = "Veriler Güncel (Migros - 07.02)";
        statusBadge.style.color = "green";
        statusBadge.style.backgroundColor = "#dcfce7";
    } catch (e) {
        console.error(e);
        statusBadge.textContent = "Veri Hatası!";
    }
}

async function loadData() {
    const priceRes = await fetch('data/prices_2024_02_07.json');
    const priceData = await priceRes.json();
    allPrices = priceData.products;

    const recipeRes = await fetch('data/recipes.json');
    allRecipes = await recipeRes.json();
}

function updatePerson(delta) {
    let newVal = personCount + delta;
    if (newVal < 1) newVal = 1;
    personCount = newVal;
    personDisplay.textContent = personCount;
}

function setBudget(val) {
    budgetInput.value = val;
    findMenus();
}

// Logic: Calculate Recipe Cost
function calculateRecipeCost(recipe) {
    let totalCost = 0;
    let breakdown = [];
    let usedIngredients = JSON.parse(JSON.stringify(recipe.base_ingredients)); // Deep copy

    // Luxury Logic
    if (isLuxury && recipe.luxury_additions) {
        recipe.luxury_additions.forEach(lux => {
            if (lux.replace) {
                // Replace existing ingredient
                const idx = usedIngredients.findIndex(i => i.item === lux.replace);
                if (idx !== -1) usedIngredients[idx] = lux;
            } else if (lux.add) {
                // Add new ingredient
                usedIngredients.push(lux);
            }
        });
    }

    usedIngredients.forEach(ing => {
        // Find price
        const priceItem = allPrices.find(p => p.name === ing.item);

        let cost = 0;
        let brandName = "Bilinmiyor";

        if (priceItem) {
            brandName = priceItem.brand || "Market";
            // Cost = Unit Price * Quantity Needed * Person Count
            // Data has 'unit_price' pre-calculated per unit (kg/lt/piece)
            cost = priceItem.unit_price * ing.qty * personCount;
        } else {
            cost = 5 * personCount; // Fallback penalty
        }

        totalCost += cost;
        breakdown.push({
            name: ing.item,
            brand: brandName,
            cost: cost.toFixed(2),
            amount: `${(ing.qty * personCount).toFixed(2)} ${ing.unit}`
        });
    });

    return { total: totalCost.toFixed(2), breakdown };
}

// Render
function findMenus() {
    const budgetPerPerson = parseFloat(budgetInput.value);
    const totalBudget = budgetPerPerson * personCount;

    resultsArea.innerHTML = '';

    // Filter Profile
    let filteredRecipes = allRecipes;
    if (currentProfile !== 'all') {
        filteredRecipes = allRecipes.filter(r => r.tags.includes(currentProfile));
    }

    // Calculate
    const affordableRecipes = filteredRecipes.map(r => {
        const calc = calculateRecipeCost(r);
        return { ...r, cost: calc.total, details: calc.breakdown };
    }).filter(r => parseFloat(r.cost) <= totalBudget); // Check against TOTAL budget

    if (affordableRecipes.length === 0) {
        resultsArea.innerHTML = `
            <div class="empty-state">
                <p>😔 ${totalBudget} TL bütçeyle ${personCount} kişi zor doyarız...</p>
                <small>"Lüks" modunu kapatmayı veya bütçeyi arttırmayı dene.</small>
            </div>
        `;
        return;
    }

    affordableRecipes.forEach(r => {
        const card = document.createElement('div');
        card.className = 'recipe-card';

        // Image Path (assuming in assets folder)
        const imgSrc = r.image ? `assets/${r.image}` : 'https://via.placeholder.com/400x200?text=Yemek';

        let badge = isLuxury ? '<span class="tag" style="background:gold; color:black">👑 Lüks</span>' : '';

        let ingredientsHtml = r.details.map(d => `
            <li class="ing-item">
                <div class="ing-left">
                    <span class="ing-name">${d.name} <span style="font-weight:normal">(${d.amount})</span></span>
                    <span class="ing-brand">Marka: ${d.brand}</span>
                </div>
                <span class="ing-price">${d.cost} TL</span>
            </li>
        `).join('');

        card.innerHTML = `
            <img src="${imgSrc}" class="card-image" alt="${r.name}">
            <div class="card-header">
                <div style="display:flex; justify-content:space-between">
                    <div class="card-title">${r.name}</div>
                    ${badge}
                </div>
                <div class="card-tags">
                    ${r.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                </div>
            </div>
            <div class="card-body">
                <div class="cost-row">
                    <div style="display:flex; flex-direction:column">
                         <span class="cost-label">Toplam Maliyet (${personCount} Kişi)</span>
                         ${isLuxury ? '<span style="font-size:0.7rem; color:goldenrod">Bol Malzemos</span>' : ''}
                    </div>
                    <span class="total-cost">${r.cost} TL</span>
                </div>
                <ul class="ingredients-list">
                    ${ingredientsHtml}
                </ul>
            </div>
        `;
        resultsArea.appendChild(card);
    });
}

function renderTicker() {
    tickerContent.innerHTML = allPrices.map(p => `
        <div class="price-pill">
            <span style="font-weight:bold">${p.brand}</span> ${p.title}: <span class="price-val">${p.price} TL</span>
        </div>
    `).join('');
}

// Events
calculateBtn.addEventListener('click', findMenus);
luxuryToggle.addEventListener('change', (e) => { isLuxury = e.target.checked; findMenus(); });

profileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        profileBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentProfile = btn.dataset.profile;
        findMenus();
    });
});

init();
