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
  .controller('MessagesController',MessagesController)
  .directive('msgRud',msgRud);

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

function MessagesController($scope, Firebase, $firebaseArray) {
  var ctrl = this;

  var ref = new Firebase('https://ekui9ksrrse.firebaseio-demo.com/messages');
  ctrl.msgs = $firebaseArray(ref);
  ctrl.msg = "";
  ctrl.send = function() {
    ctrl.msgs.$add(ctrl.msg);
    ctrl.msg = "";
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