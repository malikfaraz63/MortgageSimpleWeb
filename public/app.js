const auth = firebase.auth();
const db = firebase.firestore();
let userSignedIn = false;

const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

/// Fetches mortgage stats by loan amount
function fetchMortgageStats() {
    return new Promise(async function (resolve, reject) {
        var mortgagesData = [];
        const loanStep = 200000;
        const slices = 5;
        mortgagesData.length = slices + 1;

        for (let i = 0; i < slices; i++) {
            let loanLower = loanStep * i;
            const currentCountQuery = db.collectionGroup('mortgages')
                .where('loan', '>=', loanLower)
                .where('loan', '<', loanLower + loanStep);
            currentCountQuery.get()
                .then(querySnapshot => {
                    mortgagesData.splice(i, 0, querySnapshot.size);
                });
        }
        const finalCountQuery = db.collectionGroup('mortgages')
            .where('loan', '>=', loanStep * slices);
        finalCountQuery.get()
            .then(querySnapshot => {
                mortgagesData.splice(slices, 0, querySnapshot.size);
                resolve(mortgagesData);
            });
    });
}

function fetchRecentLeads() {
    return new Promise(async function (resolve, reject) {
        const recentMortgages = db.collectionGroup("mortgages")
            .orderBy("start", "desc")
            .limit(10); // MARK: Make variable
        recentMortgages.get()
            .then(querySnapshot => {
                let leadsData = [];
                querySnapshot.forEach(mortgage => {
                    let leadData = mortgage.data();
                    leadData.documentID = mortgage.ref.path;
                    leadsData.push(leadData);
                })
                resolve(leadsData);
            });
    });
}

let myChart;
function showMortgageStats(mortgagesData) {
    'use strict'
    console.log(mortgagesData);
    // Graphs
    const ctx = document.getElementById('myChart')
    // eslint-disable-next-line no-unused-vars
    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [
                '£0-£200k',
                '£200k-£400k',
                '£400k-£600k',
                '£600k-£800k',
                '£800k-£1m',
                '>£1m'
            ],
            datasets: [{
                data: mortgagesData,
                backgroundColor: ["#F7464A", "#46BFBD", "#FDB45C", "#949FB1", "#4D5360"],
                hoverBackgroundColor: ["#FF5A5E", "#5AD3D1", "#FFC870", "#A8B3C5", "#616774"],
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    boxPadding: 3
                }
            }
        }
    })
}

function getLeadRow(lead) {
    let leadRow = document.createElement('tr');
    let start = lead.start.toDate();
    leadRow.innerHTML = `
    <tr>
        <td>£${lead.loan.toLocaleString('en-GB')}</td>
        <td>${lead.lender}</td>
        <td>${(lead.rate * 100).toFixed(2)}%</td>
        <td>£${lead.rent.toLocaleString('en-GB')}</td>
        <td>${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}</td> 
        <td>${lead.term} yrs</td>
        <td>
            <button type="button" class="btn btn-link viewDetail" data-toggle="modal" data-target="#exampleModalCenter">
                <svg class="bi"><use xlink:href="#plus-circle"/></svg>
            </button>
        </td>
    </tr>
    `;
    return leadRow;
}

function extractUserId(documentID) {
    return documentID.split("/")[1];
}

function fetchUser(userID) {
    return new Promise(async function (resolve, reject) {
        let userQuery = db.collection("users").doc(userID);
        userQuery.get()
            .then(user => {
                resolve(user.data());
            });
    });
}

function showUserModalView(user) {
    document.getElementById("userModalTitle").innerText = user.name;
    document.getElementById("modalAddressText").innerText = user.address;
    document.getElementById("modalAgeText").innerText = user.age;
    document.getElementById("modalEmailText").innerText = user.email;
    document.getElementById("modalPhoneText").innerText = user.phone;
    document.getElementById("modalImage").setAttribute("src", user.photoURL);
}

function showRecentLeads(leadsData) {
    const leadsTable = document.getElementById("leadsTable");
    leadsData.forEach(lead => {
        leadsTable.insertAdjacentElement('beforeend', getLeadRow(lead));
    });
    const detailButtons = leadsTable.getElementsByClassName("viewDetail");
    for (let i = 0; i < leadsData.length; i++) {
        detailButtons[i].addEventListener('click', () => {
            let userID = extractUserId(leadsData[i].documentID);

            fetchUser(userID)
                .then(showUserModalView);
        });
    }
}

function getMenuItem(title, xLink) {
    let listItem = document.createElement('li', { class: "nav-item" });
    listItem.innerHTML = `
    <button class="btn btn-link align-items-center gap-2">
        <svg class="bi"><use xlink:href="#${xLink}"/></svg>
        ${title}
    </button>
    `;
    return listItem;
}

let menuItems = [
    {
        title: "Dashboard",
        xLink: "house-fill"
    },
    {
        title: "Reports",
        xLink: "graph-up"
    },
    {
        title: "Settings",
        xLink: "gear-wide-connected"
    }
]

var provider = new firebase.auth.GoogleAuthProvider();

const menuList = document.getElementById("menuList");
const dashboardView = document.getElementById("dashboardView");
const button = document.getElementById("signInButton");
const reloadDataButton = document.getElementById("reloadDataButton");
dashboardView.hidden = true;

function clearData() {
    document.getElementById("leadsTable").innerHTML = "";
    if (myChart) {
        myChart.destroy();
    }
    for (let i = 0; i < menuItems.length; i++) {
        menuList.removeChild(menuList.children[0]);
    }
}

function reloadData() {
    fetchMortgageStats()
        .then(mortgagesData => {
            dashboardView.hidden = false;
            button.className = "btn btn-link align-items-center gap-2";
            button.lastChild.data = " Sign out";
            for (let i = menuItems.length - 1; i >= 0; i--) {
                menuList.insertAdjacentElement('afterbegin', getMenuItem(menuItems[i].title, menuItems[i].xLink));
            }
            showMortgageStats(mortgagesData);
        });

    fetchRecentLeads()
        .then(showRecentLeads);
}

reloadDataButton.addEventListener('click', () => { 
    clearData(); 
    reloadData(); 
});

button.addEventListener('click', () => {
    if (userSignedIn) {
        auth.signOut().then(() => {
            dashboardView.hidden = true;
            button.lastChild.data = " Sign in";
            button.className = "btn btn-link align-items-center gap-2";
        });
        userSignedIn = false;
        button.className = "btn btn-link align-items-center gap-2 disabled";
        reloadDataButton.className = "btn btn-link align-items-center gap-2 disabled";
        clearData();
    } else {
        auth.signInWithPopup(provider)
            .then((result) => {
                reloadDataButton.className = "btn btn-link align-items-center gap-2";
                reloadData();
            });
        userSignedIn = true;
        button.className = "btn btn-link align-items-center gap-2 disabled";
    }
});