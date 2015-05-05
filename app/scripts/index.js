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
    .state('index', {
    });
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

function AppController($scope, $state, FirebaseRef, $firebaseAuth) {
  var AppCtrl = this;
  var auth = $firebaseAuth(FirebaseRef);

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
  }
  
}

function prettyJSONFactory() {
  return function(o) {
            return JSON.stringify(o,null,'\t');
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
    controller: ['$scope','Firebase','$firebaseArray', function($scope, Firebase, $firebaseArray) {
      var ctrl = this;
      ctrl.msg = "";
      ctrl.send = function() {
        if (!ctrl.msgs.$add)
          return;
        ctrl.msgs.$add(ctrl.msg);
        ctrl.msg = "";
      };
      setFirebase($scope.fireUrl);
      $scope.$watch('fireUrl',setFirebase);

      function setFirebase(val) {
        if (!val)
          return (ctrl.msgs = []);
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