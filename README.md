REST-GUARD
Library for Access Control to REST services in NODEJS.

## Synopsis
 
 The purpose of the library is to provide a lightweight library for access control to REST services.

## Code Example

**Middleware.**

To denied all API endpoints access you must use the middleware:
 
 ```javascript
 vr app = require('express')();
 var restGuard = require('rest-guard');
 ...
 //rest-guard middleware
 app.use('api_root', restGuard.middleware);
 ...
 //your api endpoint
 app.get('api_root/Promotion', your_callback);
 ```
**User credentials.** 

You must define a function to get user credentials (id, role, share link, whatever you define)
```javascript
restGuard.userCredentialsFn(function (req, callback) {
        //you must provide an Array of user's credentials.        
        var userCredentials = ['admin', '60D15600Dec75a735051560D', 'share_link_id'];
         var err = null;
        callback(err, userCredentials);
    });
```

**Permission storage configuration.**
```javascript
var db = "mongodb://localhost/rest-guard"
policyService.configureStorage(db, 'permissions_collection');
```
**Models parenting and owner definitions.**

 First, you must define your models parenting and owner properties:
 
 ```javascript
//Configuring model data owners, parenting;
//The field that represents the owner of Business is user.
 var owners = ['Business.user'];
 //Branch is parent of Promotion, Business is parent of Branch. 
 //Business has not parent.
 //With this relationship, Promotion owner is the same as Business.
 var parenting = {'Branch.business': 'Business', 'Promotion.branch': 'Branch'};
 
 restGuard.setModelOwnerFields(owners);
 restGuard.setModelParentingFields(parenting);
 ```
**Policy definition.**

To define access you must create policies first:

```javascript
//Policy over path /Promotion and method GET. 
//The method GET has an alias: ReadAll.
//The policy id is ReadAll_Promotion.

//parameters: [Model, actionAlias, uri, method]
restGuard.createPolicy('Promotion', 'ReadAll', '/Promotion', 'get'); 
```
at this point you have two options to grant access:
- to assign policies to roles.
- to assign policies to user and resources.

**Assigning policies to roles.**
```javascript
// parameters: 
//    [roles], 
//    [GET_Alias, POST_Alias, PUT_ALIAS, DELETE_Alias, * (all)], 
//    resource
restGuard.grantRoles(['admin'], [*], 'Model');
```
**Assigning policies to user and resource.**

You can define a resource's permission by id, owner, or parent.

**By id.**
 ```javascript 
 var permission = 
     {user: '60D15600Dec75a735051560D', 
     resource: {id: '559806333ec75a390b407719'}, 
     action: 'Read_Promotion'};
     //accepts object or Array
    restGuard.grantPermission(permission);
 ```
 **By owner and parent (parent and ancestors).**
 
 You can define a resource permission by owner id:
 
  ```javascript 
  var permission = 
      {user: '60D15600Dec75a735051560D', 
      resource: {owner: '559806333ec75a390b40771c'}, 
      action: 'Read_Promotion'};
      restGuard.grantPermission(permission);
 ```
 
 _**Note**: If the user is the owner of the resource, he will have full access. It is not necessary to define permission._
 
 or by parent id:
  ```javascript 
   var permission = 
       {user: '60D15600Dec75a735051560D', 
       //parent could be direct parent id or ancestor id.
       resource: {parent: '559806333ec75a390b40771b'}, 
       action: 'Read_Promotion'};
       restGuard.grantPermission(permission);
  ```

and that's all.
####Your Rest API is guarded.####


## Motivation

Security. 
In other words, access to resource must be strong guarded by policies. Roles, users, or share links must be assigned to policies by resource.

## Installation

Easy as `npm install rest-guard`.

##API Reference

```javascript

/**
* @param modelOwnersFields, an Array of string with 
* 'Model.ownerField' format.
*/
function setModelOwnerFields(modelOwnersFields);

/**
* @param modelOwnersFields, an Object with properties with 
* 'Model.parentField': 'ParentModel' format.
*/
function setModelParentingFields(modelOwnersFields);

/**
* Prints policies Object.
*/
function printPolicies();
/**
* Prints roles Object.
*/
function printRoles();

/**
 * @param model, the Model's name.
 * @param actionAlias, alias for uri/method.
 * @param uri, the route.
 * @param httpMethod, the http method
 */
function createPolicy(model, actionAlias, uri, httpMethod);

/**
* Returns policies count.
*/
function policiesCount();

/**
* When a policy is created, if the uri has a param 
* you could define if is the resource id.
*/
function setResourceId(uriParam);

/**
* When a policy is created, if the uri has a param 
* you could define if is the resource owner id.
*/
function setResourceOwnerId(uriParam);

/**
* When a policy is created, if the uri has a param 
* you could define if is the resource parent id.
*/
function setResourceParentId(uriParam);

/**
 * To grant access roles.
 * @param roles sting or Array of string
 * @param methods Array of string (get, post, put, delete)
 * @param model modelName
 */
function grantRoles(roles, methods, model);

/**
 * To revoke access roles.
 * @param roles sting or Array of string
 * @param methods Array of string (get, post, put, delete)
 * @param model modelName
 */
function revokeRoles(roles, methods, model);

/**
 * Grant permission to an user.
 * @param permissions {user, resource:{id | owner | parent}, action}
 * @param callback
 */
function grantPermission(permissions);

/**
 * Grant permission to an user.
 * @param permissions {user, resource:{id | owner | parent}, action}
 * @param callback
 */
function revokePermission(permissions);

/**
 * Function to get an Array of user ids, like id, role, alias, 
 * (whatever you define).
 * @param userCredentialsFn =  
 *function(callback){ ...; var ids=[];...; callback(ids);}
 * 
 */
function userCredentialsFn(userCredentialsFn);

/**
* Middleware that allow or deny REST API.
*
*/
function middleware(req, res, next);

/**
 * Grant access to the endpoint represented by action_model, 
 * ignoring all permissions.
 * @param model
 * @param action
 * @returns {*}
 */
function grantAccess(modelName, actionName);

/**
 * Deny access to the endpoint represented by action_model, 
 * ignoring all permissions. 
 * @param model
 * @param action
 * @returns {*}
 */
function denyAccess(modelName, actionName);

/**
 * Default access to the endpoint represented by action_model, 
 * looking for permissions to allow access. 
 * @param model
 * @param action
 * @returns {*}
 */
function defaultAccess(modelName, actionName);

/**
*@param role, the role 
*/
function hasRolePolicyPermission(role);

/**
 * Get the roles permission object.
 * @param role
 * @returns {*|{}}
 */
function getRolesPermissions ();


/**
* var to specify that a Role can access all methods.
*/
var ALL = '*';
```

## Tests 

`npm test`

You can check test/permission-test.js to see examples.

## Contributors

People, welcome aboard. You are invited to improve this library. We saw the need to guarantee resource guard over REST. Thank you in advance.

## License

MIT License.