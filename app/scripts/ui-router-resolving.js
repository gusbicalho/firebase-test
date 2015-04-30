var angular = require('angular');

module.exports = 'ui.router.resolving';
angular.module('ui.router.resolving', [require('angular-ui-router')])
  .config(stateResolvingConfig)
  .run(stateResolvingSetup)
  .directive('uiView', uiViewExtension);

stateResolvingConfig.$inject = ['$stateProvider'];
function stateResolvingConfig($stateProvider) {
  $stateProvider.decorator('path', function(state, getPath) {
    var path = getPath(state);
    
    state.self.path = [];
    
    for (var i=0; i<path.length; i++) {
      state.self.path.push(path[i].self);
    }
    
    return path;
  });

  $stateProvider.decorator('views', function(state, getViews) {
    var views = getViews(state);
    
    state.self.views = [];
    for (var name in views) {
      if (views.hasOwnProperty(name)) {
        state.self.views.push(name);
      }
    }
    
    return views;
  });
}

stateResolvingSetup.$inject = ['$rootScope','$state'];
function stateResolvingSetup($rootScope, $state) {
  $rootScope.$on('$stateChangeStart', 
    function (e, toState, toParams, fromState, fromParams) {
      var viewsToFlush = {};
      var i=0, s, j;
      
      if (fromState.path) {
        for (i=fromState.path.length-1; i>=0; i--) {
          s = fromState.path[i];
          
          if (toState.path && s === toState.path[i])
            break;
          
          for(j=0; j<s.views.length; j++) {
            viewsToFlush[s.views[j]] = true;
          }
        }
      }
      
      if (toState.path) {
        for (i+=1; i<toState.path.length; i++) {
          s = toState.path[i];
          
          for(j=0; j<s.views.length; j++) {
            viewsToFlush[s.views[j]] = true;
          }
        }
      }
      
      e.viewsToFlush = viewsToFlush;
    });
}

uiViewExtension.$inject = ['$animate','$interpolate'];
function uiViewExtension($animate, $interpolate) {
  function getViewName(scope, element, attrs) {
    var name = $interpolate(attrs.uiView || attrs.name || '')(scope);
    var inherited = element.parent().inheritedData('$uiView');
    return name.indexOf('@') >= 0 ?  name :  (name + '@' + (inherited ? inherited.state.name : ''));
  }
  
  return {
    priority: 0,
    link: function (scope, element, attrs) {
      scope.$on('$stateChangeStart', function(e) {
        var name = getViewName(scope, element, attrs);
        if (e.viewsToFlush[name]) {
          $animate.addClass(element, 'ui-resolving');
        }
      });
      
      scope.$on('$stateChangeSuccess', function() {
        $animate.removeClass(element, 'ui-resolving');
      });
      
      scope.$on('$stateChangeError', function() {
        $animate.removeClass(element, 'ui-resolving');
      });
    }
  };
}