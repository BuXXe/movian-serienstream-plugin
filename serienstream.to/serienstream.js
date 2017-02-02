/**
 * Movian plugin to watch serienstream.to streams 
 *
 * Copyright (C) 2017 BuXXe
 *
 *     This file is part of serienstream.to Movian plugin.
 *
 *  serienstream.to Movian plugin is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  serienstream.to Movian plugin is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with serienstream.to Movian plugin.  If not, see <http://www.gnu.org/licenses/>.
 *
 *  Download from : https://github.com/BuXXe/movian-serienstream-plugin
 *
 */
   var html = require('showtime/html');
   var resolvers = require('./libs/hoster-resolution-library/hrl');
   
(function(plugin) {

  var PLUGIN_PREFIX = "serienstream.to:";
 
  // resolves the hoster link and gives the final link to the stream file
  plugin.addURI(PLUGIN_PREFIX + ":EpisodesHandler:(.*):(.*):(.*)", function(page,episodeLink, hostername,pagetitle){
	  	page.type = 'directory';
	  	page.metadata.title = pagetitle;
	  	page.metadata.icon = Plugin.path + 'serienstream.png';
		
		var vidlink = resolvers.resolve("http://serienstream.to"+episodeLink, hostername)
		if(vidlink == null)
    		page.appendPassiveItem('video', '', { title: "File is not available"  });
		else
		page.appendItem(vidlink[1], 'video', { title: vidlink[0] });
  });
  
  plugin.addURI(PLUGIN_PREFIX + ":ShowHostsForEpisode:(.*)", function(page,episodeLink){
	  page.type = 'directory';
	  page.metadata.icon = Plugin.path + 'serienstream.png';
	  	var getHosterLink = showtime.httpGet("http://serienstream.to"+episodeLink);
		var dom = html.parse(getHosterLink.toString());

	    var seasonandepisodenumber = dom.root.getElementByClassName('active');
		var seriestitle= dom.root.getElementByClassName('series-title')[0].getElementByTagName("h1")[0].getElementByTagName("span")[0].textContent;
		var pagetitle = seriestitle + " - Season "+seasonandepisodenumber[0].textContent+ " - Episode "+seasonandepisodenumber[1].textContent;
		page.metadata.title = pagetitle;
		
		var description;
		try {
			description = dom.root.getElementByClassName('descriptionSpoiler')[0].textContent.trim();
		}
		catch(e)
		{
			description  = "No description available";
		}
		
		// hosters have entries for languages - need to identify attribute data-lang-key
		var hosters = dom.root.getElementByClassName('hosterSiteVideo')[0].getElementByTagName("ul")[0].getElementByTagName("li");
		
		var languages = dom.root.getElementByClassName('changeLanguageBox')[0].getElementByTagName("img");
	  	// create language dictionary for data-lang-key to title
	  	var languagedict={}
	  	for(var h=0; h<languages.length;h++)
  		{
	  		languagedict[languages[h].attributes.getNamedItem("data-lang-key").value] = languages[h].attributes.getNamedItem("title").value;
  		}
	  	
		// first anchor is the current episode, the rest are hoster links
		for(var k=1; k< hosters.length; k++)
	    {
	    	var language = languagedict[hosters[k].attributes.getNamedItem("data-lang-key").value];
	    	
			var hostname = hosters[k].getElementByTagName("i")[0].attributes.getNamedItem("class").value.replace("icon ","");
	    	var hosterlink  = hosters[k].getElementByTagName("a")[0].attributes.getNamedItem("href").value;
	    	
	    	var resolverstatus = resolvers.check(hostname);
	    	var statusmessage = resolverstatus ? " <font color=\"009933\">[Working]</font>":" <font color=\"CC0000\">[Not Working]</font>";
	    	
	    	if(resolverstatus)
	    	{
	    		page.appendItem(PLUGIN_PREFIX + ":EpisodesHandler:" + hosterlink+":"+hostname+":"+pagetitle, 'directory', {
					  title: new showtime.RichText(language +" " + hostname + statusmessage),
					  description: description
				  });
	    	}
	    	else
	    	{
	    		page.appendPassiveItem('video', '', { title: new showtime.RichText(language +" "+ hostname + statusmessage),description: description  });
	    	}
	    }
  });
  
  // Lists the available episodes for a given season
  plugin.addURI(PLUGIN_PREFIX + ":SeasonHandler:(.*)", function(page,seasonLink){
	  page.type = 'directory';
	  // get the series title and season
	  var SeasonResponse = showtime.httpGet("http://serienstream.to"+seasonLink);
	  var dom = html.parse(SeasonResponse.toString());
	  var seasonnumber = dom.root.getElementByClassName('active')[0].textContent;
	  page.metadata.icon = Plugin.path + 'serienstream.png';

	  page.metadata.title = dom.root.getElementByClassName('series-title')[0].getElementByTagName("h1")[0].getElementByTagName("span")[0].textContent  + " - Season "+ seasonnumber;
	  var tablerows = dom.root.getElementByClassName('seasonEpisodesList')[0].getElementByTagName("tbody")[0].getElementByTagName("tr");
	  
	  for (var i = 0; i < tablerows.length;i++)
	  {
		  var episodeNumber = tablerows[i].attributes.getNamedItem("data-episode-season-id").value;
		  var episodeLink = tablerows[i].getElementByTagName("td")[1].getElementByTagName("a")[0].attributes.getNamedItem("href").value;
		  
		  var a = tablerows[i].getElementByTagName("td")[1].getElementByTagName("a")[0].getElementByTagName("strong")[0].textContent;
		  var b = tablerows[i].getElementByTagName("td")[1].getElementByTagName("a")[0].getElementByTagName("span")[0].textContent;

		  var Titles = a ? (b? a + " - " + b : a) : b;

		  page.appendItem(PLUGIN_PREFIX + ":ShowHostsForEpisode:" + episodeLink , 'directory', {
			  title: "Episode " + episodeNumber + " " + Titles
		  });
	  }
  });
  
  // Series Handler: show seasons for given series link
  plugin.addURI(PLUGIN_PREFIX + ':SeriesSite:(.*)', function(page, series) {
	  	page.loading = false;
	  	page.type = 'directory';
	  	page.metadata.icon = Plugin.path + 'serienstream.png';

	    var seriespageresponse = showtime.httpGet('http://serienstream.to'+series);
	  	var dom = html.parse(seriespageresponse.toString());
	  	page.metadata.title = dom.root.getElementByClassName('series-title')[0].getElementByTagName("h1")[0].getElementByTagName("span")[0].textContent;
	  	
	  	var pages = dom.root.getElementById('stream').getElementByTagName("ul")[0].getElementByTagName("li");
	  	
	  	// INFO: first entry is the "Staffel" label
    	for (var k = 1; k< pages.length; k++)
    	{	
    		var ancor = pages[k].getElementByTagName("a")[0];
    		var seasonNumber = ancor.textContent;
    		var seasonLink = ancor.attributes.getNamedItem("href").value;
    		
    		page.appendItem(PLUGIN_PREFIX + ":SeasonHandler:"+ seasonLink, 'directory', {
    			  title: "Season " + seasonNumber
    			});
    	}
		page.loading = false;
	});
  
  // Shows a list of all series alphabetically 
  // Problem: The sorting takes too much time. But there is no faster way right now 
  // because the website only has genre sorted lists
  plugin.addURI(PLUGIN_PREFIX + ':Browse', function(page) {
	  	page.type = "directory";
	    page.metadata.title = "serienstream.to series list";
	    page.metadata.icon = Plugin.path + 'serienstream.png';
	  	var BrowseResponse = showtime.httpGet("http://serienstream.to/serien");
	  	var dom = html.parse(BrowseResponse.toString());
	  	 
	  	var entries =  dom.root.getElementById('seriesContainer').getElementByTagName("li");
	  	entries = entries.sort(sort_li);
	  	for(var k=0; k< entries.length; k++)
	    {
	    	var ancor = entries[k].getElementByTagName("a")[0];
	    	var streamLink  = ancor.attributes.getNamedItem("href").value;
	    	var title = ancor.textContent;
   	
	    	var item = page.appendItem(PLUGIN_PREFIX + ':SeriesSite:'+ streamLink, 'directory', { title: title });
	    }
  });
  
  
  function sort_li(a, b)
  {
      return (b.getElementByTagName("a")[0].textContent) < (a.getElementByTagName("a")[0].textContent) ? 1 : -1;    
  }
  
  //Search param indicates the search criteria: Artist, Album, Track
  plugin.addURI(PLUGIN_PREFIX+":Search", function(page) {
	  page.type="directory";
	  page.metadata.icon = Plugin.path + 'serienstream.png';
	  var res = showtime.textDialog("What series do you want to search for?", true,true);
	  
	  // check for user abort
	  if(res.rejected)
		  page.redirect(PLUGIN_PREFIX+"start");
	  else
	  {
		  page.metadata.title = "Search for series containing: "+ res.input;
		  var noEntry = true;
		  
		  var BrowseResponse = showtime.httpGet("http://serienstream.to/serien");
		  var dom = html.parse(BrowseResponse.toString());
		  	 
		  var entries =  dom.root.getElementById('seriesContainer').getElementByTagName("li");

		  for(var k=0; k< entries.length; k++)
		  {
			  var ancor = entries[k].getElementByTagName("a")[0];
			  var title = ancor.textContent;
			  if(title.toLowerCase().indexOf(res.input.toLowerCase())<0)
				  continue;
			  
			  var streamLink  = ancor.attributes.getNamedItem("href").value;
			  var item = page.appendItem(PLUGIN_PREFIX + ':SeriesSite:'+ streamLink, 'directory', { title: title });
			  noEntry=false;
		  }
		  		  
		  if(noEntry == true)
			  page.appendPassiveItem('video', '', { title: 'The search gave no results' });
		  
		page.loading = false;
	  }
  });

  function encode_utf8(s) {
	  return encodeURI(s);
	}

  function decode_utf8(s) {
	  return decodeURI(s);
	}

  // Register a service (will appear on home page)
  var service = plugin.createService("serienstream.to", PLUGIN_PREFIX+"start", "video", true, plugin.path + "serienstream.png");
  
  // Register Start Page
  plugin.addURI(PLUGIN_PREFIX+"start", function(page) {
    page.type = "directory";
    page.metadata.icon = Plugin.path + 'serienstream.png';
    page.metadata.title = "serienstream.to Main Menu";
    page.appendItem(PLUGIN_PREFIX + ':Browse', 'directory',{title: "Browse"});
    page.appendItem(PLUGIN_PREFIX + ':Search','item',{ title: "Search...", });
	page.loading = false;
  });

})(this);