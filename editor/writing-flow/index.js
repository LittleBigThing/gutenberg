/**
 * External dependencies
 */
import { connect } from 'react-redux';

/**
 * WordPress dependencies
 */
import { Component } from 'element';
import { keycodes, focus } from '@wordpress/utils';
import { find, reverse } from 'lodash';
/**
 * Internal dependencies
 */

import { 
	isHorizontalEdge,
	isVerticalEdge,
	computeCaretRect,
	placeCaretAtHorizontalEdge,
	placeCaretAtVerticalEdge,
	closest
} from '../utils/dom';
import {
	getBlockUids,
	getMultiSelectedBlocksStartUid,
	getMultiSelectedBlocksEndUid,
	getMultiSelectedBlocks,
	getMultiSelectedBlockUids,
	getSelectedBlock,
} from '../selectors';

import { multiSelect } from '../actions';


/**
 * Module Constants
 */
const { UP, DOWN, LEFT, RIGHT } = keycodes;

class WritingFlow extends Component {
	constructor() {
		super( ...arguments );

		this.onKeyDown = this.onKeyDown.bind( this );
		this.bindContainer = this.bindContainer.bind( this );
		this.verticalRect = null;
		this.isLastEditable = this.isLastEditable.bind( this );
		this.isFirstEditable = this.isFirstEditable.bind( this );
	}

	bindContainer( ref ) {
		this.container = ref;
	}

	getEditables( target ) {
		const outer = closest( target, '.editor-visual-editor__block-edit' );
		if ( ! outer ) {
			return [ target ];
		}

		if ( target === outer ) {
			return [ target ];
		}

		const elements = outer.querySelectorAll( '[contenteditable="true"]' );
		return [ ...elements ];
	}

	isLastEditable( target ) {
		const editables = this.getEditables( target );
		const index = editables.indexOf( target );
		return editables.length > 0 && index === editables.length - 1;
	}

	isFirstEditable( target ) {
		const editables = this.getEditables( target );
		const index = editables.indexOf( target );
		return editables.length > 0 && index === 0;
	}

	getVisibleTabbables() {
		return focus.tabbable
			.find( this.container )
			.filter( ( node ) => (
				node.nodeName === 'INPUT' ||
				node.nodeName === 'TEXTAREA' ||
				node.contentEditable === 'true' ||
				node.classList.contains( 'editor-visual-editor__block-edit' )
			) );
	}

	getClosestTabbable( target, isReverse ) {
		let focusableNodes = this.getVisibleTabbables();

		if ( isReverse ) {
			focusableNodes = reverse( focusableNodes );
		}

		focusableNodes = focusableNodes.slice( focusableNodes.indexOf( target ) );

		return find( focusableNodes, ( node, i, array ) => {
			if ( node.contains( target ) ) {
				return false;
			}

			const nextNode = array[ i + 1 ];

			// Skip node if it contains a focusable node.
			if ( nextNode && node.contains( nextNode ) ) {
				return false;
			}

			return true;
		} );
	}

	expandSelection( blocks, currentStartUid, currentEndUid, moveUp ) {
		const delta = moveUp ? -1 : +1;
		const lastIndex = blocks.indexOf( currentEndUid );
		const nextIndex = Math.max( 0, Math.min( blocks.length - 1, lastIndex + delta ) );
		this.props.onMultiSelect( currentStartUid, blocks[ nextIndex ] );
	}

	isEditableEdge( moveUp, target ) {
		if ( moveUp ) {
			return this.isFirstEditable( target );
		}

		return this.isLastEditable( target );
	}

	onKeyDown( event ) {
		const { multiSelectedBlocks, selectedBlock, selectionStart, selectionEnd, blocks } = this.props;

		const { keyCode, target } = event;
		const isUp = keyCode === UP;
		const isDown = keyCode === DOWN;
		const isLeft = keyCode === LEFT;
		const isRight = keyCode === RIGHT;
		const isReverse = isUp || isLeft;
		const isHorizontal = isLeft || isRight;
		const isVertical = isUp || isDown;

		const isShift = event.shiftKey;
		const hasMultiSelection = multiSelectedBlocks.length > 1;

		const isShift = event.shiftKey;
		const hasMultiSelection = multiSelectedBlocks.length > 1;

		if ( isVertical && isShift && hasMultiSelection ) {
			// Shift key is down and existing block selection
			event.preventDefault();
			this.expandSelection( blocks, selectionStart, selectionEnd, isReverse ? -1 : +1 );
		} else if ( isVertical && isShift && this.isEditableEdge( isReverse, target ) && isEdge( target, isReverse, true ) ) {
			// Shift key is down, but no existing block selection
			event.preventDefault();
			this.expandSelection( blocks, selectedBlock.uid, selectedBlock.uid, isReverse ? -1 : +1 );
		} else if ( isVertical && isVerticalEdge( target, isReverse ) ) {
			const closestTabbable = this.getClosestTabbable( target, isReverse );
			placeCaretAtVerticalEdge( closestTabbable, isReverse, this.verticalRect );
			event.preventDefault();
		} else if ( isHorizontal && isHorizontalEdge( target, isReverse ) ) {
			const closestTabbable = this.getClosestTabbable( target, isReverse );
			placeCaretAtHorizontalEdge( closestTabbable, isReverse );
		}
	}

	render() {
		const { children } = this.props;

		return (
			<div
				ref={ this.bindContainer }
				onKeyDown={ this.onKeyDown }
				onMouseDown={ () => this.verticalRect = null }
			>
				{ children }
			</div>
		);
	}
}

export default connect(
	( state, ownProps ) => ( {
		blocks: getBlockUids( state ),
		selectionStart: getMultiSelectedBlocksStartUid( state ),
		selectionEnd: getMultiSelectedBlocksEndUid( state ),
		multiSelectedBlocks: getMultiSelectedBlocks( state ),
		multiSelectedBlockUids: getMultiSelectedBlockUids( state ),
		selectedBlock: getSelectedBlock( state ),
	} ),
	( dispatch, ownProps ) => ( {
		onMultiSelect( start, end ) {
			dispatch( multiSelect( start, end ) );
		},
	} )
)( WritingFlow );
