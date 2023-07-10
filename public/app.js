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
                }).catch(error => {
                    reject(error);
                });
        }
        const finalCountQuery = db.collectionGroup('mortgages')
            .where('loan', '>=', loanStep * slices);
        finalCountQuery.get()
            .then(querySnapshot => {
                mortgagesData.splice(slices, 0, querySnapshot.size);
                resolve(mortgagesData);
            })
            .catch(error => {
                reject(error);
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
        <td>£${lead.loan.toLocaleString('en-US')}</td>
        <td>${lead.lender}</td>
        <td>${(lead.rate * 100).toFixed(2)}%</td>
        <td>£${lead.rent.toLocaleString('en-US')}</td>
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
            }).catch(error => {
                reject(error);
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

function getMenuItem(title, id, xLink) {
    let listItem = document.createElement('li');
    listItem.className = "nav-item";
    listItem.innerHTML = `
    <button class="btn btn-link align-items-center gap-2" id="${id}">
        <svg class="bi"><use xlink:href="#${xLink}"/></svg>
        ${title}
    </button>
    `;
    return listItem;
}

let menuItems = [
    {
        title: "Dashboard",
        id: "dashboardButton",
        xLink: "house-fill"
    },
    {
        title: "Chat",
        id: "chatButton",
        xLink: "chat"
    },
    {
        title: "Settings",
        id: "settingsButton",
        xLink: "gear-wide-connected"
    }
]

var provider = new firebase.auth.GoogleAuthProvider();

const menuList = document.getElementById("menuList");
const titleLabel = document.getElementById("titleLabel");
const dashboardView = document.getElementById("dashboardView");
const messagesView = document.getElementById("messagesView");
const button = document.getElementById("signInButton");
const reloadDataButton = document.getElementById("reloadDataButton");
const messagesList = document.getElementById("messagesList");
const usersList = document.getElementById("usersList");

messagesView.hidden = true;
dashboardView.hidden = true;

function clearAlerts() {
    console.log("EE");
    document.getElementById("alertView").innerHTML = "";
}
/**
 * 
 * @param {string} type 
 * @param {string} title 
 * @param {string} message 
 */
function showAlert(type, title, message) {
    const alertView = document.getElementById("alertView");
    const alert = document.createElement('div')
    alert.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        <p><strong>${title}</strong></p>
        <p>${message}</p>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
        </button>
    </div>
    `;

    alertView.insertAdjacentElement('beforeend', alert);
}

/**
 * 
 * @param {boolean} isLogout 
 */
function clearData(isLogout) {
    document.getElementById("leadsTable").innerHTML = "";
    clearAlerts();
    if (myChart) {
        myChart.destroy();
    }
    if (isLogout) {
        let removalLength = menuList.children.length - 1;
        for (let i = 0; i < removalLength; i++) {
            menuList.removeChild(menuList.children[0]);
        }
    }
}

/**
 * 
 * @param {boolean} isLogin 
 */
function loadData(isLogin) {
    fetchMortgageStats()
        .then(mortgagesData => {
            dashboardView.hidden = false;
            button.className = "btn btn-link align-items-center gap-2";
            reloadDataButton.className = "btn btn-link align-items-center gap-2";
            button.lastChild.data = " Sign out";
            if (isLogin) {
                for (let i = menuItems.length - 1; i >= 0; i--) {
                    menuList.insertAdjacentElement('afterbegin', getMenuItem(menuItems[i].title, menuItems[i].id, menuItems[i].xLink));
                }
            }
            document.getElementById("dashboardButton").addEventListener('click', showDashboardView);
            document.getElementById("chatButton").addEventListener('click', showMessagesView);
            showMortgageStats(mortgagesData);
            showAlert('success', "Fetch Success", `${new Date().toLocaleTimeString('en-US')} - successfully updated data from server.`);
        }).catch(error => {
            button.className = "btn btn-link align-items-center gap-2";
            button.lastChild.data = " Sign out";
            showAlert('warning', "Fetch Error", `${new Date().toLocaleTimeString('en-US')} - ${error.message}`);
        });

    fetchRecentLeads()
        .then(showRecentLeads);
}

reloadDataButton.addEventListener('click', () => {
    clearData(false);
    loadData(false);
});

button.addEventListener('click', () => {
    if (userSignedIn) {
        auth.signOut()
            .then(() => {
                dashboardView.hidden = true;
                userSignedIn = false;
                button.lastChild.data = " Sign in";
                button.className = "btn btn-link align-items-center gap-2";
                showAlert('success', "Logout Success", `${new Date().toLocaleTimeString('en-US')} - user logged out successfully`);
            });

        button.className = "btn btn-link align-items-center gap-2 disabled";
        reloadDataButton.className = "btn btn-link align-items-center gap-2 disabled";
        clearMessagesView();
        clearData(true);
    } else {
        auth.signInWithPopup(provider)
            .then((result) => {
                button.className = "btn btn-link align-items-center gap-2";
                userSignedIn = true;
                showDashboardView();
                loadData(true);
                showAlert('success', "Login Success", `${new Date().toLocaleTimeString('en-US')} - ${result.user.email} logged in successfully`);
            }).catch((error) => {
                button.className = "btn btn-link align-items-center gap-2";
                showAlert('warning', "Login Failed", error.message);
            });
        button.className = "btn btn-link align-items-center gap-2 disabled";
        clearData(false);
    }
});

/**
 * 
 * @param {*} message 
 * @param {boolean} isClient 
 */
function showUserMessage(message, user, isClient) {
    let side = isClient ? "left" : "right";
    let userMessage = document.createElement('div');
    userMessage.className = `chat-message-${side} pb-4`;
    userMessage.innerHTML = `
    <div>
        <img src="${isClient ? user.photoURL : "companyAvatar.png"}" class="rounded-circle mr-1" width="40" height="40">
        <div class="text-muted small text-nowrap mt-2">${message.sent.toDate().toLocaleTimeString('en-US')}</div>
    </div>
    <div class="flex-shrink-1 bg-light rounded py-2 px-3 ml-3">
        <div class="font-weight-bold mb-1">${isClient ? user.name : "You"}</div>
        ${message.message}
    </div>
    `;
    
    messagesList.insertAdjacentElement('beforeend', userMessage);
}

function showUserMessages(messagesData, user) {
    // FIXME: add cell reuse maybe?
    messagesList.innerHTML = "";
    messagesData.forEach(doc => { showUserMessage(doc.messageData, user, doc.isClient) });
}

function showUserDetails(user) {
    document.getElementById("messageUserTitle").innerHTML = `<strong>${user.name}</strong>`
    document.getElementById("messageUserPhoto").src = user.photoURL;
}

/**
 * 
 * @param {string} userId 
 * @param {string} messageText 
 */
function sendMessage(userId) {
    console.log("sendingto : " + userId);
    let messageTextField = document.getElementById("messageTextField");

    if (messageTextField.value.length == 0) {
        return;
    }

    db
        .collection("users")
        .doc(userId)
        .collection("companyMessages")
        .add({message: messageTextField.value, sent: new Date(), read: false})
        .catch(error => {
            showAlert('warning', "Message Send Error", `${new Date().toLocaleTimeString('en-US')} - ${error.message}`);
        });
    
    messageTextField.value = "";
}

function changeSendButtonDestination(userId) {
    document.getElementById("sendMessageButton").remove();
    
    let newButton = document.createElement('button');
    newButton.className = "btn btn-primary"; newButton.id = "sendMessageButton";
    newButton.addEventListener('click', () => { sendMessage(userId) });
    newButton.innerText = "Send";
    document.getElementById("sendMessageView").insertAdjacentElement('beforeend', newButton);
}

function setUserMessagesListener(userId, user) { 
    let clientMessages = [];
    let companyMessages = [];
    let messagesData = [];

    changeSendButtonDestination(userId);

    var clientMessagesListener = db
        .collection("users")
        .doc(userId)
        .collection("clientMessages")
        .onSnapshot(querySnapshot => {
            clientMessages = [];
            querySnapshot.forEach(doc => {
                clientMessages.push({
                    messageData: doc.data(),
                    isClient: true
                });
            });

            showUserDetails(user);
            messagesData = clientMessages.concat(companyMessages);
            if (messagesData.length > 0) {
                messagesData.sort((a, b) => a.messageData.sent.seconds > b.messageData.sent.seconds);
                showUserMessages(messagesData, user);
                messagesList.scrollTop = messagesList.scrollHeight;
            } else {
                messagesList.innerHTML = `
                <div class="alert alert-info" role="alert">
                    No conversations were found.
                </div>
                `;
            }
        });

    var companyMessagesListener = db
        .collection("users")
        .doc(userId)
        .collection("companyMessages")
        .onSnapshot(querySnapshot => {
            companyMessages = [];
            querySnapshot.forEach(doc => {
                companyMessages.push({
                    messageData: doc.data(),
                    isClient: false
                });
            });

            showUserDetails(user);
            messagesData = clientMessages.concat(companyMessages);
            if (messagesData.length > 0) {
                messagesData.sort((a, b) => a.messageData.sent.seconds > b.messageData.sent.seconds);
                showUserMessages(messagesData, user);
                messagesList.scrollTop = messagesList.scrollHeight;
            } else {
                messagesList.innerHTML = `
                <div class="alert alert-info" role="alert">
                    No conversations were found.
                </div>
                `;
            }
        });
}

/**
 * 
 * @param {string} name 
 * @param {number} unreadMessages 
 * @param {string} email
 * @param {string} photoURL
 */
function getUserButton(documentID, user) {
    const userButton = document.createElement('a');
    userButton.className = "userButton list-group-item list-group-item-action border-0";
    
    /* when unread messages count is being updated...
    if (unreadMessages > 0) {
        userButton.innerHTML += `
            <div class="badge bg-success float-right">${user.unread}</div>`;
    }
    */
    userButton.innerHTML += `
        <div class="d-flex align-items-start">
            <img src="${user.photoURL}" class="rounded-circle mr-1" width="40" height="40">
            <div class="flex-grow-1 ml-3">
                ${user.name}
                <div class="small"><span class="fas fa-circle chat-online"></span> ${user.email}</div>
            </div>
        </div>
    </a>
    `;
    userButton.addEventListener('click', () => { 
        try {
            companyMessagesListener();
            clientMessagesListener();
        } catch {}
        setUserMessagesListener(extractUserId(documentID), user);
    });
    return userButton;
}

function clearMessagesView() {
    messagesList.innerHTML = "";
    document.getElementById("messageUserTitle").innerHTML = "<strong>No user selected</strong>";
    document.getElementById("messageUserPhoto").src = "";
    const userButtons = document.getElementsByClassName("userButton");
    while (userButtons.length > 0) {
        userButtons[0].remove();
    }
}

function showDashboardView() {
    messagesView.hidden = true;
    dashboardView.hidden = false;
    reloadDataButton.hidden = false;
    clearAlerts();
    titleLabel.innerText = "Dashboard";
    clearMessagesView();
}

function showMessagesView() {
    messagesView.hidden = false;
    dashboardView.hidden = true;
    reloadDataButton.hidden = true;
    clearAlerts();
    titleLabel.innerText = "Messages";
    clearMessagesView();
    db.collection("users")
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                let userButton = getUserButton(doc.ref.path, doc.data());
                usersList.insertAdjacentElement('beforeend', userButton);
            })
            let hr = document.createElement('hr');
            hr.className = "d-block d-lg-none mt-1 mb-0";
            usersList.insertAdjacentElement('beforeend', hr);
            showAlert('success', "Fetch Success", `${new Date().toLocaleTimeString()} - Users fetched successfully.`);
        });
}