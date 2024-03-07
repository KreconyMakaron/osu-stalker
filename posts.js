console.log('Content Script Loaded!');

const raw_posts = document.getElementsByClassName('search-forum-post')

const url = document.baseURI
const user_id = url.match(/[0-9]+/)[0]
const page = url.match(/(?<=page=)[0-9]+/)[0]

if(raw_posts.length == 0) browser.runtime.sendMessage({
	posts: null,
	user: Number(user_id),
	page: Number(page),
});
else {
	const posts = ([].slice.call(raw_posts)).map((x) => {
		return {url: x.getElementsByClassName('search-forum-post__link')[0].href, time: Date.parse(x.getElementsByClassName('search-forum-post__time js-timeago')[0].title)}
	});

	browser.runtime.sendMessage({
		posts: posts,
		user: Number(user_id),
		page: Number(page),
	})
}
