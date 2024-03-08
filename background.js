let buffer = {};
let timeoutID;

// hardcoded for now
let wait_time = 20000; 		//5 minutes
let ids = [14068656, 25168274]; //filomaster, krecony

const perms = {
	permissions: ["tabs", "tabHide", "scripting"],
	origins: ["*://osu.ppy.sh/*"],
}

function removeTabs() {
    return browser.tabs.query({}).then(tabs => {
        browser.tabs.remove(tabs.filter(tab => {
            return tab.url.endsWith("hihi");
        }).map((tab) => tab.id))
    });
}

function removeTabsById(id) {
    return browser.tabs.query({}).then(tabs => {
        browser.tabs.remove(tabs.filter(tab => {
            return tab.url.endsWith("hihi") && tab.url.match(/[0-9]+/)[0] == id;
        }).map((tab) => tab.id))
    });
}

function createTab(url) {
	return browser.tabs.create({url:url, active:false})
	.then(tab => {
		console.log(`Created Tab ${tab.id} for user ${url.match(/[0-9]+/)[0]} on page ${url.match(/(?<=page=)[0-9]+/)[0]}!`);
		browser.tabs.hide(tab.id);
		return tab;
	})
}

function getPosts(user_id, page) {
	return createTab(`https://osu.ppy.sh/users/${user_id}/posts?query=&forum_id=&forum_children=on&page=${page}&hihi`);
}

function updateUser(user_id) {
	let temp = [];
	while(buffer[user_id].length != 0) {
		temp = [].concat(buffer[user_id][buffer[user_id].length - 1], temp);
		buffer[user_id].pop();
	}
	browser.storage.local.get("users").then((users) => {
		users = users.users;
		if(temp.length != 0 && temp[temp.length-1].time == users[user_id].time) temp.pop();
		if(temp.length != 0) users[user_id].latest = temp[0].time;

		browser.storage.local.set({users: users});
		if(temp.length != 0) console.log(`New posts for ${user_id}: `, temp, `\nNew timestamp: ${temp[0].time}`);
		else console.log(`No new posts for ${user_id}`);
	});
	removeTabsById(user_id);
}

function handlePosts(msg) {
	browser.storage.local.get("users").then((users) => {
		users = users.users;
		if(msg.posts == null) updateUser(msg.user);
		else if(msg.posts[msg.posts.length - 1].time <= users[msg.user].latest) {
			let temp = [];
			msg.posts.forEach((post) => { 
				if(post.time > users[msg.user].latest) temp.push(post); 
			})
			buffer[msg.user].push(temp);
			updateUser(msg.user);
		}
		else {
			buffer[msg.user].push(msg.posts);
			getPosts(msg.user, msg.page + 1);
		}
	});
}


function update() {
	ids.forEach((user_id) => {
		buffer[user_id] = [];
	});

	return browser.storage.local.get("users").then((x) => {
		let users = x.users;
		if(users == undefined) users = {}

		ids.forEach((user_id) => {
			if(users[user_id] == undefined) users[user_id] = {
				latest: 0,
			}
		})

		browser.storage.local.set({users: users}).then(() => {
			removeTabs().then(ids.forEach((user_id) => {
				console.log(`Processing user ${user_id}!`);
				getPosts(user_id, 1);
			}))
		})
	});
}

function addUser(id) {
	ids.push(id);
}

function removeUser(id) {
	let index = ids.indexOf(id);
	if(index > -1) ids.splice(index, 1);
}

function run() {
	update();
	timeoutID = setTimeout(run, wait_time);
}

function reload() {
	clearTimeout(timeoutID)
	run();
}

browser.runtime.onMessage.addListener(handlePosts);

//Entry point
browser.permissions.contains(perms).then((state) => {
	if(state == false) console.log("Permissions not granted!");
	else run();
})
