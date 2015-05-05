var angular = require('angular');

module.exports = 'gb.FirebaseTest';

require('angularfire/node_modules/firebase');

angular.module('gb.FirebaseTest', [
                require('./ui-router-resolving'),
                require('angularfire')
              ])
  .config(config)
  .run(basicSetup)
  .factory('FirebaseRef',FirebaseRefFactory)
  .controller('AppController',AppController)
  .filter('prettyJSON',prettyJSONFactory)
  .directive('msgRud',msgRud)
  .directive('fireMsgsCrud',fireMsgsCrud);

require('./states-email');

var _ = require('lodash');

config.$inject = ['$urlRouterProvider', '$locationProvider', '$stateProvider'];
function config($urlProvider, $locationProvider, $stateProvider) {
  $urlProvider.otherwise('/');
  $locationProvider.html5Mode({
    enabled:true,
    requireBase: false
  });
  $locationProvider.hashPrefix('!');
  $stateProvider
    .state('index', {});
}

basicSetup.$inject = ['$rootScope','$state'];
function basicSetup($rootScope, $state) {
  $rootScope.$on('$stateChangeError',function(event,toState,toParams,fromState,fromParams,error) {
    console.log('$stateChangeError',event,toState,toParams,fromState,fromParams,error);
  });
}

function FirebaseRefFactory(Firebase) {
  return new Firebase('https://burning-torch-5101.firebaseio.com/');
}

function AppController($scope, $state, FirebaseRef, $firebaseAuth, $firebaseObject) {
  var AppCtrl = this;
  var auth = $firebaseAuth(FirebaseRef), userObj, unbindUserObj;

  AppCtrl.emailLogin = function() { $state.go('emailLogin'); };
  AppCtrl.emailSignup = function() { $state.go('emailSignup'); };
  AppCtrl.loginFB = loginFB;
  AppCtrl.logout = function() { auth.$unauth(); };
  
  auth.$onAuth(onAuth);

  function loginFB() {
    auth.$authWithOAuthPopup('facebook')
      .catch(function(reason) {
        if (reason.code === "TRANSPORT_UNAVAILABLE") {
          return auth.$authWithOAuthRedirect('facebook');
        }
        throw reason;
      })
      .catch(function(reason) {
        alert(reason.message);
        console.log(reason);
      });
  }
  function onAuth(authData) {
    AppCtrl.authData = authData;
    if (userObj) {
      if (!unbindUserObj)
        throw new Error('Wait for previous login to end!');
      unbindUserObj();
      userObj.$destroy();
      userObj = unbindUserObj = null;
      delete AppCtrl.user;
      delete AppCtrl.msgsRef;
    }
    if (!authData)
      return;
    userObj = $firebaseObject(FirebaseRef.child('accounts').child(authData.uid));
    userObj.$loaded()
      .then(function(userObj) {
        if (!userObj.provider) {
          userObj.provider = authData.provider;
          userObj.name = getName(authData);
          return userObj.$save().then(function() { return userObj; });
        }
        return userObj;
      })
      .then(function(userObj) {
        return userObj.$bindTo($scope,'AppCtrl.user')
                .then(function(unbind) {
                  unbindUserObj = unbind;
                  AppCtrl.msgsRef = userObj.$ref().child('messages').toString();
                  return userObj;
                });
      });
  }
  
  // find a suitable name based on the meta info given by each provider
  function getName(authData) {
    switch(authData.provider) {
       case 'password':
         return authData.password.email.replace(/@.*/, '');
       case 'facebook':
         return authData.facebook.displayName;
    }
  }
  
}

function prettyJSONFactory() {
  return function(o) {
            var json;
            try {
              json = JSON.stringify(o,null,'\t');
            } catch(error) {
              if (error instanceof TypeError)
                return '[Circular]';
              throw error;
            }
            return json;
         };
}

function fireMsgsCrud() {
  return {
    restrict: 'EA',
    scope: {
      fireUrl: '@',
    },
    template: [
      '<ul>',
        '<li ng-repeat="msg in ctrl.msgs">',
          '<msg-rud msgs="ctrl.msgs" msg="msg"></msg-rud>',
        '</li>',
      '</ul>',
      '<form ng-submit="ctrl.send()">',
        '<input type="text" ng-model="ctrl.msg">',
      '</form>',
      ].join(''),
    controllerAs: 'ctrl',
    controller: ['$scope','$timeout','Firebase','$firebaseArray', function($scope, $timeout, Firebase, $firebaseArray) {
      var ctrl = this;
      ctrl.msg = "";
      ctrl.send = function() {
        if (!ctrl.msgs)
          return;
        ctrl.msgs.$add(ctrl.msg);
        ctrl.msg = "";
      };
      setFirebase($scope.fireUrl);
      $scope.$watch('fireUrl',setFirebase);

      function setFirebase(val,oldVal) {
        if (ctrl.msgs) {
          var fa = ctrl.msgs;
          $timeout(function(){fa.$destroy();});
        }
        if (!val)
          return (delete ctrl.msgs);
        ctrl.msgs = $firebaseArray(new Firebase(val));
      }
    }]
  };
}

function msgRud() {
  return {
    restrict: 'EA',
    scope: {
      msgs: '=',
      msg: '=',
      isEditing: '=?'
    },
    template: [
      '<span ng-if="!isEditing">',
        '<a href ng-click="edit()">{{msg.$value}}</a>',
      '</span>',
      '<form ng-if="isEditing" ng-submit="save()">',
        '<input type="text" ng-model="msg.$value">',
        '<a href ng-click="save()">Ok</a>',
      '</form>',
      ' <a href ng-click="msgs.$remove(msg)">(x)</a>',
      ].join(''),
    controller: ['$scope', function($scope) {
      $scope.edit = function() {
        $scope.isEditing = true;
      };
      $scope.save = function() {
        $scope.msgs.$save($scope.msg);
        $scope.isEditing = false;
      };
    }]
  };
}