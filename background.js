let buffer = {};
let users_left;
let old_users;

// hardcoded for now
let wait_time = 20000;
let ids = [14068656, 25168274]; //filomaster, krecony

const perms = {
	permissions: [ "tabs", "tabHide", "scripting" ],
	origins: ["*://osu.ppy.sh/*"],
}

function difference(s1, s2, user) {
	user_old = s1[user].posts;
	user_new = s2[user].posts;
	if(user_old.length == user_new.length) return [];
	let temp = [];
	for(let i = 0; i < user_new.length - user_old.length; i += 1) temp.push(user_new[i]);
	return temp;
}

function removeOldTabs() {
	return browser.tabs.query({}).then(tabs => { browser.tabs.remove(tabs.filter(tab => { return tab.url.endsWith("hihi"); }).map((tab) => tab.id)) });
}

function removeTabs(id) {
	return browser.tabs.query({}).then(tabs => { browser.tabs.remove(tabs.filter(tab => { return tab.url.endsWith("hihi") && tab.url.match(/[0-9]+/)[0] == id; }).map((tab) => tab.id)) });
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
		users[user_id].posts = [].concat(temp, users[user_id].posts);
		if(temp.length != 0) users[user_id].latest = temp[0].time;

		browser.storage.local.set({users: users});
		users_left--;
		if(users_left == 0) ids.forEach((id) => {
			let diff = difference(old_users, users, id);
			if(diff.length != 0) console.log(`New posts for ${id}: `, diff);
			else console.log(`No new posts for ${id}`);
		})
	});
	removeTabs(user_id);
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
	})
}

browser.runtime.onMessage.addListener(handlePosts);

function update() {
	ids.forEach((user_id) => {
		buffer[user_id] = [];
	});

	return browser.storage.local.get("users").then((x) => {
		let users = x.users;
		if(users == undefined) users = {}

		ids.forEach((user_id) => {
			if(users[user_id] == undefined) users[user_id] = {
				posts: [],
				latest: 0,
			}
		})

		users_left = ids.length;
		old_users = users;

		browser.storage.local.set({users: users}).then(() => {
			removeOldTabs().then(ids.forEach((user_id) => {
				console.log(`Processing user ${user_id}!`);
				getPosts(user_id, 1);
			}))
		})
	});
}

function run() {
	update();
	setTimeout(run, wait_time);
}

browser.permissions.contains(perms).then((state) => {
	if(state == false) console.log("Permissions not granted!");
	else run();
})
