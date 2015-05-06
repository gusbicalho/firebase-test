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

require('./service-auth');
require('./states-email');
require('./states-account');

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

function AppController($scope, $state, FirebaseRef, $firebaseObject, Auth) {
  var AppCtrl = this;

  AppCtrl.emailLogin = function() { $state.go('emailLogin'); };
  AppCtrl.emailSignup = function() { $state.go('emailSignup'); };
  AppCtrl.loginFB = loginFB;
  AppCtrl.logout = function() { Auth.logout(); };

  Auth.onAuth(onAuth);

  function loginFB() {
    Auth.loginFacebook().catch(function(reason) {
        alert(reason.message);
        console.log(reason);
      });
  }
  function onAuth(authData) {
    AppCtrl.authData = authData;
    Auth.user
      .then(function(userObj) {
        if (!userObj) {
          delete AppCtrl.msgsRef;
          return;
        }
        AppCtrl.msgsRef =
          userObj.accountId?
            FirebaseRef.child('accounts').child(userObj.accountId).child('messages').toString():
            null;
      })
  }
}

function prettyJSONFactory() {
  return function(o) {
            var json;
            try {
              json = JSON.stringify(o,null,'  ');
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
        '<input type="text" ng-model="ctrl.msg" ng-disabled="!ctrl.msgs">',
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