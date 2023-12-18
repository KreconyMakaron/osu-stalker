function getHTML (url) {
	return fetch(url)
    .then(function(response) {
        return response.text()
    })
    .then(function(html) {
        var parser = new DOMParser();
        return parser.parseFromString(html, "text/html");
    })
    .catch(function(err) {  
        console.log('Failed to fetch page: ', err);  
    });
}
