var angular = require('angular');

module.exports = 'gb.FirebaseTest';

require('angularfire/node_modules/firebase');

angular.module('gb.FirebaseTest', [
                require('./ui-router-resolving'),
                require('angularfire')
              ])
  .config(config)
  .run(basicSetup)
  .controller('AppController',AppController);

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
  console.log('asd',Firebase);
  var ref = new Firebase('https://ekui9ksrrse.firebaseio-demo.com/');
  var AppCtrl = this;
  $firebaseObject(ref).$bindTo($scope,'AppCtrl.data');
}
