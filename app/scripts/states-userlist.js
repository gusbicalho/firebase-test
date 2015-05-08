module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .config(configStates);

configStates.$inject = ['$stateProvider'];
function configStates($stateProvider) {
  $stateProvider
    .state('userlist', {
      url: '/allusers',
      template: TEMPLATE,
      resolve: {
        UserProfiles: function(FirebaseRef, $firebaseArray) {
          return $firebaseArray(FirebaseRef.child('profiles').orderByChild('username')).$loaded();
        },
      },
      onExit: function(UserProfiles) {
        if (UserProfiles)
          UserProfiles.$destroy();
      },
      controller: Controller,
      controllerAs: 'ctrl'
    })
    ;
}

function Controller(FirebaseRef, UserProfiles) {
  var ctrl = this;

  ctrl.profiles = UserProfiles;
  ctrl.selected = null;
  
  UserProfiles.$loaded().then(function(){
    ctrl.selected = UserProfiles[0];
  });
}

var TEMPLATE = [
  '<h2>All Users</h2>',
  '<select ng-model="ctrl.selected" ng-options="profile as profile.username for profile in ctrl.profiles"></select>',
  '<div>',
    '<pre>{{ctrl.selected | prettyJSON}}</pre>',
  '</div>',
  ].join('');
