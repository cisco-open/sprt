import ReduxThunk from 'redux-thunk';
import { applyMiddleware, createStore, combineReducers, compose } from 'redux';

import * as Reducers from './reducers';

const rootReducer = combineReducers(Reducers);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default createStore(
    rootReducer, /* preloadedState, */ 
    composeEnhancers(
        applyMiddleware(ReduxThunk)
    )
);