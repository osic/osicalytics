 


var app = angular.module("osicApp", ['ui.bootstrap']);
app.factory('timeFrames', function() {
  var service = {},
      weeks,
      months,
      quarters;

  
  return service;
});
/*
TODO:
 - Get json for the Hats (companies) we really care about
 - Use D3 to render a pie chart
 - A message showing a "Loading" or something for UX purposes
 */
app.factory('myFactory', function($http, $q) {
  var service = {},
      baseUrl = 'http://stackalytics.openstack.org/api/1.0/stats/engineers?callback=JSON_CALLBACK&',
      _finalUrls = {},
      _release,
      _metricsType,
      _startDate,
      _endDate,
      _metrics = [],
      _members,
      _memberStats,
      _utcOffset = -18000,
      _modules = [],
      _osicModules = [];
  
  var makeUrl = function(release, module, company, selectedMember) {
    angular.forEach(_metricsType, function(metric, idx) {
      _metricsType[idx].url = baseUrl +
                              'start_date=' +
                              _startDate + '&' +
                              'end_date=' + 
                              _endDate + '&' +
                              'metric=' + metric.code + '&'

      if(release != null && release != undefined){
        _metricsType[idx].url += 'release=' + release.id + "&"; 
      }
      if(module != null && module != undefined){
        _metricsType[idx].url += 'module=' + module.name + "&";                     
      }
      if(company != null && company != undefined){
         _metricsType[idx].url += 'company=' + company.id + "&";
      }
      if(selectedMember != null && selectedMember != undefined){
         _metricsType[idx].url += 'user_id=' + selectedMember + "&";
      }
    });
  }
  
  service.setMetricsType = function(metrics) {
    _metricsType = metrics;
  }
  
  service.setHats = function(hats) {
    _hats = hats;
  }
  
  service.setStartDate = function(startDate) {
    _startDate = startDate.getTime() / 1000 - _utcOffset; 
  }
  
  service.setEndDate = function(endDate) {
    _endDate = endDate.getTime() / 1000 - _utcOffset; 
  }
  
  service.setMembers = function(members) {
    _members = members;
  }

  service.setModules = function(modules){
    _modules = modules;
  }

  service.osicModules = function(osicModules){
    _osicModules = osicModules;
  }
  
  service.getModules = function(modules){
    return _modules;
  }

  service.getNumbers = function(release, module, company, selectedMember) {
    var promises = [];
    makeUrl(release, module, company, selectedMember);
    angular.forEach(_metricsType, function(metric, idx) {
      var deferred = $q.defer();
      $http.jsonp(metric.url)
        .success(function(data) {
          deferred.resolve(data);
        }).error(function(data, status) {
          deferred.reject(status)
      });
      deferred.promise.code = metric.code;
      promises.push(deferred.promise);
    });
    
    $.when(promises).then(calculateMetrics);
    /*
    .success(function(data) {
        mem = findMembers(_members, data.stats)
 
      }).error(function() {
        // TODO: on error
      });
      */
  }

  var calculateMetrics = function(promises) {
    angular.forEach(promises, function(promise, idx) {
      var metricType = promise.code;
      promise.then(function(data){
        members = findMembers(data.stats);
        setMetric(metricType, calculateMetric(members, 'metric'));
      })
    })
  }
  var setMetric = function(metricType,  metric) {
    _metrics[metricType] = metric; 
  }
  
  service.getMetric = function(metricType) {
    return _metrics[metricType];
  }
  
  var calculateMetric = function(stats, prop) {
    return stats.reduce(function(a, b) {
      return a + b[prop];
    }, 0);
  }
  
  var findMembers = function(allMembers) {
    memberIds = _members.map(function(member){return member.launchpad_id;})
    return allMembers.filter(function(member, idx) {
      if (memberIds.includes(member.id)) 
        return member.metric;
    });
  }
  
  return service;
});

app.controller('scoreCtrl', function($scope, $http, myFactory) {
  var users = {}, 
      metrics = [];
  metrics = [
    {code: 'commits', name: 'Commits'},
    {code: 'bpc', name: 'Completed Blueprints'},
    {code: 'bpd', name: 'Drafted Blueprints'},
    {code: 'patches', name:'Patches'},
    {code: 'resolved-bugs', name: 'Resolved Bugs'},
    {code: 'marks', name: 'Reviews'}
  ];
  
  $http.get('projects.json').then(function(response){
    $scope.osicModules = response.data.projects;
  });

  $http({
    method: 'GET',
    url:'http://stackalytics.openstack.org/api/1.0/modules'
  }).then(function (response){
    $scope.modules = response.data.data
  })
  
  $http({
    method: 'GET',
    url:'http://stackalytics.openstack.org/api/1.0/releases'
  }).then(function (response){
    $scope.releases = response.data.data.splice(1, response.data.data.length)
  })
 
  $scope.dateOptions = {
    maxDate: new Date(),
    showWeeks: true 
  };

  $scope.dateFormat = 'MM/dd/yyyy';

  $scope.openStartDate = function() {
    $scope.popupStartDate.opened = true;
  };

  $scope.openEndDate= function() {
    $scope.popupEndDate.opened = true;
  };

  $scope.popupStartDate = {
    opened: false
  };

  $scope.popupEndDate = {
    opened: false
  };

  // This function sets start/end time frames
  $scope.setTimeFrame = function(timeFrame) {
    var today = new Date(),
        year = today.getFullYear(),
        month = today.getMonth(),
        day = today.getDate()
        quarter = Math.floor((month + 3) / 3);

    switch(timeFrame) {
      case 'currentWeek':
        $scope.startDate = new Date(year, month, day - today.getDay());
        $scope.endDate = today;
        break;
      case 'previousWeek':
        $scope.startDate = new Date(year, month, day - today.getDay() - 7);
        $scope.endDate= new Date(year, month, day - today.getDay() -1);
        break;
      case 'currentMonth':
        $scope.startDate = new Date(year, month, 1);
        $scope.endDate = new Date(year, month + 1, 0);
        break;
      case 'previousMonth':
        $scope.startDate = new Date(year, month - 1, 1);
        $scope.endDate = new Date(year, month, 0);
        break;
      case 'currentQuarter':
        $scope.startDate = new Date(year, quarter * 3 - 3, 1);
        $scope.endDate = new Date(year, (quarter + 1) * 3 - 3, 0);
        break;
      case 'previousQuarter':
        $scope.startDate = new Date(year, (quarter - 1) * 3 - 3 , 1);
        $scope.endDate = new Date(year, quarter  * 3 - 3, 0);
        break;
    }   
  };


  $scope.$watchCollection('[startDate, endDate]', function (newValues, oldValues) {
    if (newValues) {
      $scope.getNumbers();    
    }
    
  });

  $scope.hats = [
    {text: "Intel" , id:"intel"}, 
    {text: "Rax", id:"rackspace"}
  ]

  $scope.members = [];
  $scope.projectMembers = [];

  $http.get('members.json').then(function(response){
    $scope.members = response.data.members;
  });

  $scope.onModuleChange = function(){
    if($scope.selectedModule != null && $scope.selectedModule != undefined){
      $scope.projectMembers = $scope.members.filter(function(member){
        
        if(member.project.includes($scope.selectedModule.name)){
          return member;
        }

      });
    }
    else{
      $scope.projectMembers = [];
    }
  }

  $scope.onSelectedMember = function (caller) {
    console.log(caller.selectedMember);
    $scope.selectedMember = caller.selectedMember;
  }

  $scope.getNumbers = function() {
    
    myFactory.setMetricsType(metrics);
    myFactory.setMembers($scope.members);
    myFactory.setHats($scope.hats)
    myFactory.setStartDate($scope.startDate);
    myFactory.setEndDate($scope.endDate);
    myFactory.getNumbers($scope.selectedRelease, $scope.selectedModule, $scope.seletedHat, $scope.selectedMember);
    
    setTimeout(function() {
      $scope.$apply(function() {
        $scope.commits = myFactory.getMetric('commits');  
        $scope.bpd = myFactory.getMetric('bpd');  
        $scope.bpc = myFactory.getMetric('bpc');
        $scope.marks = myFactory.getMetric('marks');
        $scope.resolved_bugs = myFactory.getMetric('resolved-bugs');
        $scope.filed_bugs = myFactory.getMetric('filed-bugs');
        $scope.patches= myFactory.getMetric('patches');
      })
      
    }, 2700);
   
  }
  
});