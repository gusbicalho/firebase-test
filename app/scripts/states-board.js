module.exports = 'gb.FirebaseTest';

angular.module('gb.FirebaseTest')
  .config(configStates);

var _ = require('lodash');

function configStates($stateProvider) {
  $stateProvider
    .state('board', {
      url: '/board',
      template: INDEX_TEMPLATE,
      resolve: {
        User: ['Auth', function(Auth) {
          return Auth.getUser();
        }],
        authData: ['Auth', function(Auth) {
          return Auth.waitForAuth();
        }]
      },
      onExit: ['User',function(User) {
        User.$destroy();
      }],
      controller: BoardController,
      controllerAs: 'ctrl'
    })
    .state('board.post', {
      url: '/:postId',
      template: POST_TEMPLATE,
      resolve: {},
      controller: PostController,
      controllerAs: 'postCtrl'
    })
    ;
}

function BoardController(Firebase, FirebaseRef, Auth, User, authData, $scope, $q, $scope) {
  var ctrl = this;

  ctrl.boardPosts = [];
  ctrl.newPost = {};
  ctrl.submitNew = submitNew;

  var offAuth = Auth.onAuth(function(newAuthData) {
    if ((!!newAuthData !== !!authData) ||
        (newAuthData && authData && newAuthData.uid !== authData.uid)) {
      offAuth();
      $state.reload('user');
    }
  });

  var rootPostsRef = FirebaseRef.child('board/rootPosts');
  rootPostsRef.on('child_added',postAdded);
  rootPostsRef.on('child_removed',postRemoved);
  $scope.$on('$destroy',function(event) {
    rootPostsRef.off('child_added',postAdded);
    rootPostsRef.off('child_removed',postRemoved);
  });

  function postAdded(data, prev) {
    $scope.$applyAsync(function() {
      var i = prev ?
                1 + _.findIndex(ctrl.boardPosts, function(post) { return post.key === prev; }):
                ctrl.boardPosts.length;
      console.log('added',ctrl.boardPosts,data.key(),prev,i);
      var post = {
        key: data.key(),
        data: null,
        ref: FirebaseRef.child('board/posts').child(data.key()),
        onValue: function(data) {
          $scope.$applyAsync(function() { post.data = data.val(); });
        }
      };
      post.ref.on('value',post.onValue);
      $scope.$on('$destroy',function(event) {
        post.ref.off('value',post.onValue);
      });
      ctrl.boardPosts.splice(i,0,post);
    });
  }

  function postRemoved(data) {
    $scope.$applyAsync(function() {
      var i = _.findIndex(ctrl.boardPosts, function(post) { return post.key === data.key(); });
      if (1 >= 0) {
        var post = ctrl.boardPosts[i];
        post.ref.off('value',post.onValue);
        ctrl.boardPosts.splice(i,1);
      }
    });
  }

  function submitNew(parent) {
    if (!User || ctrl.submittingNew) return;
    console.log(ctrl.newPost);
    ctrl.submittingNew = true;
    ctrl.newPost.author = authData.uid;
    ctrl.newPost.timestamp = Firebase.ServerValue.TIMESTAMP;
    if (parent)
      ctrl.newPost.parent = parent;
    $q(function(res,rej) {
      var newPostRef = FirebaseRef.child('board/posts').push(ctrl.newPost, function(error) {
        if (error) return rej(error);
        res(newPostRef);
      });
    })
    .then(function(newPostRef) {
      return $q(function(res,rej) {
        FirebaseRef.child('board/rootPosts/'+newPostRef.key()).set(true, function(error) {
          if (error) return rej(error);
          res(newPostRef);
        });
      });
    })
    .then(function(newPostRef) {
      ctrl.newPost = {};
    })
    .catch(function(error) {
      alert(error.message);
      console.log(error);
    })
    .finally(function() {
      ctrl.submittingNew = false;
    });
  }
}

function PostController() {
}

var INDEX_TEMPLATE = [
  '<h2>Board</h2>',
  '<a ui-sref="board">Back to Root</a>',
  '<div ui-view>',
    '<h3>Root</h3>',
    '<form ng-submit="ctrl.submitNew()" ng-disabled="!User" style="position:relative;margin:0.5em;padding:0.5em;border:1px solid #AAA">',
      '<gb-overlay condition="ctrl.submittingNew"></gb-overlay>',
      '<h3>New post</h3>',
      'Title: <input ng-model="ctrl.newPost.title"><br>',
      'Text:<br>',
      '<textarea ng-model="ctrl.newPost.text"></textarea>',
      '<br>',
      '<button type="submit">Submit</button>',
    '</form>',
    '<ul>',
      '<li ng-repeat="post in ctrl.boardPosts">',
        '<a ui-sref="board.post({postId:post.key})">{{post.data.title}}</a>',
      '</li>',
    '</ul>',
  '</div>',
  ].join('');

var POST_TEMPLATE = [
  '<h3>Post</h3>',
  ].join('');