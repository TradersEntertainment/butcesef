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
const basketModal = document.getElementById('basketModal');
const basketList = document.getElementById('basketList');
const basketTotal = document.getElementById('basketTotal');
const closeBasketBtn = document.getElementById('closeBasket');

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

// Logic: Calculate Recipe Cost (Portion)
function calculateRecipeCost(recipe) {
    let totalMealCost = 0;
    let breakdown = [];
    let shoppingList = [];
    let shoppingTotal = 0;

    let usedIngredients = JSON.parse(JSON.stringify(recipe.base_ingredients));

    // Luxury Logic
    if (isLuxury && recipe.luxury_additions) {
        recipe.luxury_additions.forEach(lux => {
            if (lux.replace) {
                const idx = usedIngredients.findIndex(i => i.item === lux.replace);
                if (idx !== -1) usedIngredients[idx] = lux;
            } else if (lux.add) {
                usedIngredients.push(lux);
            }
        });
    }

    usedIngredients.forEach(ing => {
        // Find ALL matching price items
        const matchingItems = allPrices.filter(p => p.name === ing.item);

        let priceItem = null;

        if (matchingItems.length > 0) {
            // Sort by Unit Price (Cheapest First)
            matchingItems.sort((a, b) => a.unit_price - b.unit_price);

            if (isLuxury && matchingItems.length > 1) {
                // For luxury mode, maybe pick the most expensive or a specific premium brand?
                // For now, let's stick to base logic: Luxury Toggle changes *Ingredients* (Butter instad of Oil), 
                // but we still want the best price for Butter unless specified.
                // Let's keep cheapest default, but if user wants "Premium Brand" that's a differnt feature.
                // Actually, let's pick the 2nd cheapest or expensive one if luxury is ON? 
                // No, Luxury changes the MATERIAL (Butter vs Oil). Keep brand cheap to save money for better materials.
                priceItem = matchingItems[0];
            } else {
                priceItem = matchingItems[0]; // Cheapest
            }
        }

        let portionCost = 0;
        let packageCost = 0;
        let brandName = "Bilinmiyor";
        let packageTitle = "Bulunamadı";

        const neededQty = ing.qty * personCount;

        if (priceItem) {
            brandName = priceItem.brand || "Market";
            packageTitle = priceItem.title;

            // Portion Cost
            portionCost = priceItem.unit_price * neededQty;

            // Shopping Logic
            let packageSize = 1.0;
            // Heuristic size parsing
            if (priceItem.unit === 'kg' && priceItem.title.includes('500g')) packageSize = 0.5;
            if (priceItem.unit === 'kg' && priceItem.title.includes('250g')) packageSize = 0.25;
            if (priceItem.unit === 'lt' && priceItem.title.includes('200ml')) packageSize = 0.2;

            // Allow integer items
            if (priceItem.unit === 'adet' && priceItem.title.includes("30")) packageSize = 30;

            // Simplistic: 1 package minimum.
            packageCost = priceItem.price;

            // For bulk (e.g. 5kg rice needed, package is 1kg), mulitply
            if (neededQty > packageSize && priceItem.unit !== 'adet') {
                const packsNeeded = Math.ceil(neededQty / packageSize);
                packageCost = priceItem.price * packsNeeded;
            }

        } else {
            portionCost = 5 * personCount;
        }

        totalMealCost += portionCost;
        if (priceItem) shoppingTotal += packageCost;

        breakdown.push({
            name: ing.item,
            brand: brandName,
            cost: portionCost.toFixed(2),
            amount: `${neededQty.toFixed(2)} ${ing.unit}`
        });

        shoppingList.push({
            title: packageTitle,
            brand: brandName,
            price: packageCost,
            needed: neededQty,
            unit: ing.unit
        });
    });

    return {
        mealTotal: totalMealCost.toFixed(2),
        shoppingTotal: shoppingTotal.toFixed(2),
        breakdown,
        shoppingList
    };
}

let currentAffordableRecipes = [];

// Render
function findMenus() {
    const budgetPerPerson = parseFloat(budgetInput.value);
    const totalBudget = budgetPerPerson * personCount;

    resultsArea.innerHTML = '';

    let filteredRecipes = allRecipes;
    if (currentProfile !== 'all') {
        filteredRecipes = allRecipes.filter(r => r.tags.includes(currentProfile));
    }

    currentAffordableRecipes = filteredRecipes.map(r => {
        const calc = calculateRecipeCost(r);
        return { ...r, ...calc };
    }).filter(r => parseFloat(r.mealTotal) <= totalBudget);

    if (currentAffordableRecipes.length === 0) {
        resultsArea.innerHTML = `
            <div class="empty-state">
                <p>😔 ${totalBudget} TL bütçeyle ${personCount} kişi zor doyarız...</p>
                <small>"Lüks" modunu kapatmayı veya bütçeyi arttırmayı dene.</small>
            </div>
        `;
        return;
    }

    currentAffordableRecipes.forEach((r, index) => {
        const card = document.createElement('div');
        card.className = 'recipe-card';

        const imgSrc = r.image ? r.image : 'https://via.placeholder.com/400x200?text=Yemek';
        let badge = isLuxury ? '<span class="tag" style="background:gold; color:black">👑 Lüks</span>' : '';

        let ingredientsHtml = r.breakdown.map(d => `
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
                         <span class="cost-label">Porsiyon Maliyeti (${personCount} Kişi)</span>
                    </div>
                    <span class="total-cost">${r.mealTotal} TL</span>
                </div>
                <!-- Basket Button -->
                <button class="basket-btn" onclick="openBasket(${index})">
                    🛒 Sepet Oluştur (Kasada: ${r.shoppingTotal} TL)
                </button>
                <ul class="ingredients-list">
                    ${ingredientsHtml}
                </ul>
            </div>
        `;
        resultsArea.appendChild(card);
    });
}

function openBasket(index) {
    const recipe = currentAffordableRecipes[index];
    basketList.innerHTML = '';

    recipe.shoppingList.forEach(item => {
        const li = document.createElement('li');
        li.className = 'basket-item';
        li.innerHTML = `
            <div class="basket-item-info">
                <span class="basket-item-title">${item.brand} ${item.title}</span>
                <span class="basket-item-sub">İhtiyaç: ${item.needed.toFixed(2)} ${item.unit}</span>
            </div>
            <span class="basket-item-price">${item.price.toFixed(2)} TL</span>
        `;
        basketList.appendChild(li);
    });

    basketTotal.textContent = `${recipe.shoppingTotal} TL`;
    basketModal.style.display = 'flex';
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

closeBasketBtn.addEventListener('click', () => {
    basketModal.style.display = 'none';
});

window.onclick = function (event) {
    if (event.target == basketModal) {
        basketModal.style.display = "none";
    }
}

init();
