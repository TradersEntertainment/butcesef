// State
let allPrices = [];
let allRecipes = [];
let currentProfile = 'all';

// Selectors
const calculateBtn = document.getElementById('calculateBtn');
const budgetInput = document.getElementById('budgetInput');
const resultsArea = document.getElementById('resultsArea');
const profileBtns = document.querySelectorAll('.profile-btn');
const statusBadge = document.getElementById('data-status');
const tickerContent = document.getElementById('tickerContent');

// Init
async function init() {
    try {
        await loadData();
        renderTicker();
        statusBadge.textContent = "Veriler Güncel (Migros)";
        statusBadge.style.color = "green";
        statusBadge.style.backgroundColor = "#dcfce7";
    } catch (e) {
        console.error(e);
        statusBadge.textContent = "Veri Hatası!";
        statusBadge.style.color = "red";
    }
}

async function loadData() {
    // Determine which price file to load. For now, hardcoded to today's mock/real file.
    // In production, we might fetch 'latest.json'
    const priceRes = await fetch('data/prices_2024_02_07.json');
    const priceData = await priceRes.json();
    allPrices = priceData.products;

    const recipeRes = await fetch('data/recipes.json');
    allRecipes = await recipeRes.json();
}

// Logic: Calculate Recipe Cost
function calculateRecipeCost(recipe) {
    let totalCost = 0;
    let missingIngredients = [];
    let breakdown = [];

    recipe.ingredients.forEach(ing => {
        // Find price for this ingredient
        // Simple fuzzy match: check if price name contains ingredient item name
        const priceItem = allPrices.find(p => p.name.includes(ing.item) || p.found_title.toLowerCase().includes(ing.item));

        if (priceItem) {
            // Price Logic:
            // If unit is kg, and we need 0.5 kg -> price * 0.5
            // If unit is piece (yumurta), price is for 30, we need 2 -> (price/30) * 2

            // Simplifying assumptions for MVP:
            // We assume the scraper returns a 'base price' and we do quick math provided we know the scraper unit.
            // But our scraper returns "price" for "unit". 
            // e.g. Yumurta: 99.50 for "30 adet". Unit cost = 3.31

            let unitCost = 0;
            // Parse unit from scraper data
            if (priceItem.unit.includes('30')) unitCost = priceItem.price / 30;
            else if (priceItem.unit.toLowerCase().includes('kg') || priceItem.unit.toLowerCase().includes('1 l')) {
                unitCost = priceItem.price; // Per unit (kg or L)
            }
            else if (priceItem.unit.includes('500')) {
                unitCost = priceItem.price * 2; // Normalize to kg
            }
            else {
                unitCost = priceItem.price; // Fallback
            }

            const ingredientCost = unitCost * ing.qty_algo;
            totalCost += ingredientCost;

            breakdown.push({
                name: ing.item,
                cost: ingredientCost.toFixed(2),
                display: `${ing.amount} ${ing.unit_type}`
            });
        } else {
            missingIngredients.push(ing.item);
            // Penalty cost for missing items (Average assumption)
            totalCost += 50;
        }
    });

    return { total: totalCost.toFixed(2), breakdown, missing: missingIngredients };
}

// Render
function findMenus() {
    const budget = parseFloat(budgetInput.value);
    resultsArea.innerHTML = '';

    // Filter by Profile
    let filteredRecipes = allRecipes;
    if (currentProfile !== 'all') {
        filteredRecipes = allRecipes.filter(r => r.tags.includes(currentProfile));
    }

    // Calculate Costs and Filter by Budget
    const affordableRecipes = filteredRecipes.map(r => {
        const calculation = calculateRecipeCost(r);
        return { ...r, cost: calculation.total, details: calculation.breakdown };
    }).filter(r => parseFloat(r.cost) <= budget);

    if (affordableRecipes.length === 0) {
        resultsArea.innerHTML = `
            <div class="empty-state">
                <p>😔 Bu bütçeyle tarif bulamadık.</p>
                <small>Bütçeyi biraz arttırmayı dene veya "Yumurta" stokla.</small>
            </div>
        `;
        return;
    }

    affordableRecipes.forEach(r => {
        const card = document.createElement('div');
        card.className = 'recipe-card';

        let ingredientsHtml = r.details.map(d => `
            <li class="ing-item">
                <span>${d.display} ${d.name}</span>
                <span class="ing-price">${d.cost} TL</span>
            </li>
        `).join('');

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${r.name}</div>
                <div class="card-tags">
                    ${r.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                </div>
            </div>
            <div class="card-body">
                <div class="cost-row">
                    <span class="cost-label">Tahmini Maliyet</span>
                    <span class="total-cost">${r.cost} TL</span>
                </div>
                <ul class="ingredients-list">
                    ${ingredientsHtml}
                </ul>
                <div style="margin-top:15px; font-size:0.8rem; color:#888;">
                    * Migros fiyatlarıyla hesaplandı.
                </div>
            </div>
        `;
        resultsArea.appendChild(card);
    });
}

function renderTicker() {
    tickerContent.innerHTML = allPrices.map(p => `
        <div class="price-pill">
            ${p.name}: <span class="price-val">${p.price} TL</span>
            ${p.campaign ? '🔥' : ''}
        </div>
    `).join('');
}

// Event Listeners
calculateBtn.addEventListener('click', findMenus);

profileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        profileBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentProfile = btn.dataset.profile;
        findMenus(); // Auto refresh
    });
});

init();
