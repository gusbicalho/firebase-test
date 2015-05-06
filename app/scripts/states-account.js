module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .controller('AccountController', AccountController)
  .config(configStates)
  ;

var _ = require('lodash');

configStates.$inject = ['$stateProvider'];
function configStates($stateProvider) {
  $stateProvider
    .state('account', {
      template: ACCOUNT_TEMPLATE,
      resolve: {
        authData: ['Auth', function(Auth) {
          return Auth.waitForAuth();
        }],
        User: ['Auth', function(Auth) {
          return Auth.user;
        }],
      },
      onExit: ['$state', function($state) {
        console.log('account onExit');
        if ($state.current.data.offAuth) {
          console.log('calling offAuth');
          $state.current.data.offAuth();
        }
      }],
      data: {yay:'lol'},
      controller: 'AccountController',
      controllerAs: 'ctrl'
    })
    ;
}

function AccountController(FirebaseRef, Auth, User, authData, $firebaseObject, $scope, $state) {
  var ctrl = this;

  ctrl.newAccount = {};
  ctrl.saveNew = saveNew;
  
  var offAuth = Auth.onAuth(function(newAuthData) {
    console.log('reload?',
        (!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid));
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid))
      $state.reload('account');
  });
  $state.current.data.offAuth = offAuth;
  $state.current.data.call = [];
  $state.current.data.destroy = [];
  
  if (User) {
    User.$bindTo($scope,'ctrl.user')
      .then(function(unbind) {
        willCall(unbind);
      });
    loadAccount(User.accountId);
  }
  
  var accountObj;
  function loadAccount(aid) {
    console.log('accountId',aid);
    if (!aid)
      return (accountObj = null);
    accountObj = $firebaseObject(FirebaseRef.child('accounts').child(aid));
    accountObj.$bindTo($scope,'ctrl.account')
                .then(function(unbind) {
                  willCall(unbind);
                });
  }
  
  function saveNew() {
    console.log('saveNew', ctrl.newAccount);
  }
  
  function willDestroy(obj) {
    $state.current.data.destroy.push(obj);
  }
  function willCall(fn) {
    $state.current.data.call.push(fn);
  }
}

var ACCOUNT_TEMPLATE = [
  '<h2>Account</h2>',
  '<div ng-if="!accountObj">',
    '<h3>Create new account</h3>',
    '<form ng-submit="ctrl.saveNew()">',
      '<input type="text" placeholder="Name" ng-model="ctrl.newAccount.name"><br>',
      '<input type="text" placeholder="Country" ng-model="ctrl.newAccount.country"><br>',
      '<button type="submit">Create</button>',
    '</form>',
  '</div>',
  '<pre>"user": {{ctrl.user | prettyJSON}}</pre>',
  '<pre>"account": {{ctrl.account | prettyJSON}}</pre>',
  ].join('');
