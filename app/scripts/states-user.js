module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .config(configStates);

configStates.$inject = ['$stateProvider'];
function configStates($stateProvider) {
  $stateProvider
    .state('user', {
      url: '/user',
      template: TEMPLATE,
      resolve: {
        User: ['Auth', function(Auth) {
          return Auth.getUser();
        }],
        authData: ['Auth', function(Auth) {
          return Auth.waitForAuth();
        }]
      },
      controller: Controller,
      controllerAs: 'ctrl'
    })
    ;
}

function Controller(Auth, User, authData, $state, $scope) {
  var ctrl = this;

  if (User)
    User.$bindTo($scope, 'ctrl.user');
  
  var offAuth = Auth.onAuth(function(newAuthData) {
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid)) {
      offAuth();
      $state.reload('user');
    }
  });
}

var TEMPLATE = [
  '<h2>User</h2>',
  '<pre>{{ctrl.user | prettyJSON}}</pre>'
  ].join('');
