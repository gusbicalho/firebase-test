var angular = require('angular');

module.exports = 'gb.FirebaseTest';

require('angularfire/node_modules/firebase');

angular.module('gb.FirebaseTest', [
                require('./ui-router-resolving'),
                require('angularfire')
              ])
  .config(config)
  .run(basicSetup)
  .controller('AppController',AppController)
  .directive('msgRud',msgRud)
  .directive('fireMsgsCrud',fireMsgsCrud);

var _ = require('lodash');

config.$inject = ['$urlRouterProvider', '$locationProvider', '$stateProvider'];
function config($urlProvider, $locationProvider, $stateProvider) {
  $urlProvider.otherwise('/');
  $locationProvider.html5Mode({
    enabled:true,
    requireBase: false
  });
  $locationProvider.hashPrefix('!');
}

basicSetup.$inject = ['$rootScope','$state'];
function basicSetup($rootScope, $state) {
  $rootScope.$on('$stateChangeError',function(event,toState,toParams,fromState,fromParams,error) {
    console.log('$stateChangeError',event,toState,toParams,fromState,fromParams,error);
  });
  $rootScope.$on('$stateChangeSuccess',function(event,toState,toParams,fromState,fromParams,error) {
    console.log('$stateChangeSuccess',event,toState,toParams,fromState,fromParams,error);
  });
}

function AppController($scope, Firebase, $firebaseObject) {
  var AppCtrl = this;

  var ref = new Firebase('https://ekui9ksrrse.firebaseio-demo.com/');
  $firebaseObject(ref).$bindTo($scope,'AppCtrl.data');
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
          return ctrl.msgs = [];
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