// State
let allPrices = [];
let allRecipes = [];
let currentProfile = 'all';
let personCount = 1;
let isLuxury = false;
let activeTab = 'planner';

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
const basketInfo = document.getElementById('basketInfo');

// Tab Logic
const tabPlanner = document.getElementById('tabPlanner');
const tabPantry = document.getElementById('tabPantry');
const sectionPlanner = document.getElementById('sectionPlanner');
const sectionPantry = document.getElementById('sectionPantry');
const pantrySearchBtn = document.getElementById('pantrySearchBtn');
const pantryInput = document.getElementById('pantryInput');

// Init
async function init() {
    try {
        await loadData();
        renderTicker();
        statusBadge.textContent = "✅ Sistem Online";
        statusBadge.style.color = "green";
        statusBadge.style.backgroundColor = "#dcfce7";
    } catch (e) {
        console.error("Init Error:", e);
        statusBadge.textContent = "❌ Veri Hatası";
        statusBadge.style.color = "red";
        statusBadge.style.backgroundColor = "#fee2e2";
        resultsArea.innerHTML = `<div class="empty-state">Veri yüklenemedi. Lütfen sayfayı yenileyin.</div>`;
    }
}

async function loadData() {
    try {
        const priceRes = await fetch('data/prices_2024_02_07.json');
        const priceData = await priceRes.json();
        allPrices = priceData.products || [];

        const recipeRes = await fetch('data/recipes.json');
        allRecipes = await recipeRes.json() || [];

        console.log(`Loaded ${allPrices.length} prices and ${allRecipes.length} recipes.`);
    } catch (e) {
        throw new Error("Failed to load JSON data");
    }
}

function updatePerson(delta) {
    let newVal = personCount + delta;
    if (newVal < 1) newVal = 1;
    personCount = newVal;
    personDisplay.textContent = personCount;
    if (activeTab === 'planner' && resultsArea.innerHTML !== '') findMenus();
}

function setBudget(val) {
    budgetInput.value = val;
    findMenus();
}

function calculateRecipeCost(recipe) {
    try {
        let totalMealCost = 0;
        let breakdown = [];
        let shoppingList = [];
        let shoppingTotal = 0;
        let maxYield = 999;
        let limitingFactor = "";

        let usedIngredients = JSON.parse(JSON.stringify(recipe.base_ingredients));

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
            // Find Matching Items
            const matchingItems = allPrices.filter(p => p.name.toLowerCase() === ing.item.toLowerCase());
            let priceItem = null;

            if (matchingItems.length > 0) {
                // Safe Sort
                matchingItems.sort((a, b) => {
                    const pa = parseFloat(a.unit_price) || 999;
                    const pb = parseFloat(b.unit_price) || 999;
                    return pa - pb;
                });
                priceItem = matchingItems[0];
            }

            let portionCost = 0;
            let packageCost = 0;
            let brandName = "Bilinmiyor";
            let packageTitle = "Stokta Yok";
            let boughtAmount = 0;

            const neededQty = parseFloat(ing.qty) * personCount;

            if (priceItem) {
                brandName = priceItem.brand || "Market";
                packageTitle = priceItem.title;

                portionCost = (parseFloat(priceItem.unit_price) || 0) * neededQty;
                const unitPrice = parseFloat(priceItem.price) || 0;

                // Package Logic
                let packageSize = 1.0;
                if (priceItem.unit === 'kg' && priceItem.title.includes('500g')) packageSize = 0.5;
                if (priceItem.unit === 'kg' && priceItem.title.includes('830g')) packageSize = 0.83;
                if (priceItem.unit === 'kg' && priceItem.title.includes('250g')) packageSize = 0.25;
                if (priceItem.unit === 'lt' && priceItem.title.includes('200ml')) packageSize = 0.2;
                if (priceItem.unit === 'adet' && priceItem.title.includes("30")) packageSize = 30;

                let packsNeeded = 1;
                if (neededQty > packageSize) {
                    packsNeeded = Math.ceil(neededQty / packageSize);
                }

                packageCost = unitPrice * packsNeeded;
                boughtAmount = packageSize * packsNeeded;

                const ingredientYield = neededQty > 0 ? Math.floor(boughtAmount / (ing.qty * personCount)) : 999; // Yield per MEAL (person count specific)

                if (ingredientYield < maxYield) {
                    maxYield = ingredientYield;
                    limitingFactor = ing.item;
                }

            } else {
                portionCost = 10 * personCount; // Fallback penalty
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
            shoppingList,
            yieldInfo: { count: maxYield, limit: limitingFactor }
        };
    } catch (err) {
        console.error("Calc Error:", err);
        return { mealTotal: "0.00", shoppingTotal: "0.00", breakdown: [], shoppingList: [], yieldInfo: {} };
    }
}

let currentAffordableRecipes = [];

function findMenus() {
    activeTab = 'planner';
    try {
        const budgetVal = parseFloat(budgetInput.value);
        if (isNaN(budgetVal)) {
            alert("Lütfen geçerli bir bütçe girin.");
            return;
        }

        const totalBudget = budgetVal * personCount;
        resultsArea.innerHTML = '';

        let filteredRecipes = allRecipes;
        if (currentProfile !== 'all') {
            filteredRecipes = allRecipes.filter(r => r.tags.includes(currentProfile));
        }

        currentAffordableRecipes = filteredRecipes.map(r => {
            const calc = calculateRecipeCost(r);
            return { ...r, ...calc };
        }).filter(r => parseFloat(r.mealTotal) <= totalBudget);

        // Sorting: cheapest first
        currentAffordableRecipes.sort((a, b) => parseFloat(a.mealTotal) - parseFloat(b.mealTotal));

        if (currentAffordableRecipes.length === 0) {
            resultsArea.innerHTML = `
                <div class="empty-state">
                    <p>😔 ${totalBudget.toFixed(2)} TL bütçeyle ${personCount} kişi zor doyarız...</p>
                    <small>Bütçeyi arttırmayı dene veya Lüks modunu kapat.</small>
                </div>
            `;
            return;
        }

        currentAffordableRecipes.forEach((r, index) => {
            renderCard(r, index);
        });
    } catch (e) {
        console.error("FindMenus Error:", e);
        resultsArea.innerHTML = `<div class="empty-state">Hesaplama hatası oldu. 🛠️</div>`;
    }
}

function searchPantry() {
    activeTab = 'pantry';
    const input = pantryInput.value.toLowerCase();
    if (!input) {
        resultsArea.innerHTML = `<div class="empty-state">Lütfen malzeme girin.</div>`;
        return;
    }

    const userIngredients = input.split(',').map(i => i.trim());
    resultsArea.innerHTML = '';
    currentAffordableRecipes = [];

    const scoredRecipes = allRecipes.map(r => {
        const rIngredients = r.base_ingredients.map(i => i.item.toLowerCase());
        const matchCount = rIngredients.filter(i =>
            userIngredients.some(ui => ui.length > 2 && i.includes(ui))
        ).length;

        return { ...r, matchScore: matchCount, totalIng: rIngredients.length };
    }).filter(r => r.matchScore > 0);

    scoredRecipes.sort((a, b) => b.matchScore - a.matchScore);

    if (scoredRecipes.length === 0) {
        resultsArea.innerHTML = `<div class="empty-state"><p>Bu malzemelerle bir şey bulamadık. 🥔</p></div>`;
        return;
    }

    scoredRecipes.forEach(r => {
        const calc = calculateRecipeCost(r);
        const cardData = { ...r, ...calc, isPantry: true };
        currentAffordableRecipes.push(cardData);
        renderCard(cardData, currentAffordableRecipes.length - 1);
    });
}

function renderCard(r, index) {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const imgSrc = r.image ? r.image : 'https://via.placeholder.com/400x200?text=Yemek';
    let badge = isLuxury ? '<span class="tag" style="background:gold; color:black">👑 Lüks</span>' : '';
    if (r.matchScore) badge += ` <span class="tag" style="background:#dcfce7; color:green">${r.matchScore}/${r.totalIng} Malzeme Var</span>`;

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
                <div>${badge}</div>
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
            <button class="basket-btn" onclick="openBasket(${index})">
                🛒 Sepet Oluştur (Kasada: ${r.shoppingTotal} TL)
            </button>
            <ul class="ingredients-list">
                ${ingredientsHtml}
            </ul>
        </div>
    `;
    resultsArea.appendChild(card);
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

    if (recipe.yieldInfo) {
        basketInfo.innerHTML = `
            <p>💡 <b>Verimlilik:</b> Bu alışverişle bu yemeği tam <b>${recipe.yieldInfo.count} kere</b> yapabilirsin!</p>
            <p style="font-size:0.8rem; color:#666">İlk bitecek malzeme: ${recipe.yieldInfo.limit}</p>
        `;
    }

    basketModal.style.display = 'flex';
}

function renderTicker() {
    if (!allPrices.length) return;
    tickerContent.innerHTML = allPrices.map(p => `
        <div class="price-pill">
            <span style="font-weight:bold">${p.brand}</span> ${p.title}: <span class="price-val">${p.price} TL</span>
        </div>
    `).join('');
}

// Logic: Use correct 'closest' tab selector or IDs
if (tabPlanner) {
    tabPlanner.addEventListener('click', () => {
        tabPlanner.classList.add('active');
        tabPantry.classList.remove('active');
        sectionPlanner.style.display = 'block';
        sectionPantry.style.display = 'none';
    });
}

if (tabPantry) {
    tabPantry.addEventListener('click', () => {
        tabPantry.classList.add('active');
        tabPlanner.classList.remove('active');
        sectionPlanner.style.display = 'none';
        sectionPantry.style.display = 'block';
    });
}

if (calculateBtn) calculateBtn.addEventListener('click', findMenus);
if (pantrySearchBtn) pantrySearchBtn.addEventListener('click', () => {
    currentAffordableRecipes = [];
    searchPantry();
});
if (luxuryToggle) luxuryToggle.addEventListener('change', (e) => { isLuxury = e.target.checked; findMenus(); });

profileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        profileBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentProfile = btn.dataset.profile;
        findMenus();
    });
});

if (closeBasketBtn) closeBasketBtn.addEventListener('click', () => {
    basketModal.style.display = 'none';
});

window.onclick = function (event) {
    if (event.target == basketModal) {
        basketModal.style.display = "none";
    }
}

// Enter key support for budget
if (budgetInput) {
    budgetInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') findMenus();
    });
}

init();
