F.on('load', function() {
	//check install
	MODULE('install').check(function(res) {
		if (res==true) {
			//MODULE('shedule').start();
			//MODEL('event').sync();
		}
	});		
});             
