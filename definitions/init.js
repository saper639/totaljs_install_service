var Settings = MODEL('Settings');
F.on('load', function() {
        //prepare script for browser    
	Settings.scripts();
	//check install
	MODULE('install').check(function(res) {
		if (res==true) {
			//MODULE('shedule').start();
			//MODEL('event').sync();
		}
	});		
});             
