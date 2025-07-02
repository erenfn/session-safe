import PropTypes from 'prop-types';
import { popupStyles } from './PopUpStyles';
import Button from '../Button/Button';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

const PopUpMessages = ({
  open,
  header,
  leftButtonText,
  rightButtonText,
  leftButtonClickHandler,
  rightButtonClickHandler,
  leftButtonType,
  rightButtonType,
  handleOpenLink,
  additionanLinkButton,
  thirdButtonText,
  thirdButtonClickHandler,
  thirdButtonType,
  showThirdButton = false,
  isLoading = false,
  loadingButtonNumber = null,
  headerSx = {},
  contentSx = {},
  children,
}) => {
  return (
    <Dialog
      PaperProps={{ sx: popupStyles.paper }}
      open={open}
      onClose={leftButtonClickHandler}
      closeAfterTransition={open}
    >
      <DialogTitle sx={{ ...popupStyles.title, ...headerSx }}>{header}</DialogTitle>

      <DialogContent sx={{...popupStyles.content, ...contentSx}}>{children}</DialogContent>

      <DialogActions sx={popupStyles.actions}>
        {additionanLinkButton && (
          <Button
            text="Open link"
            buttonType="secondary"
            variant="text"
            onClick={handleOpenLink}
            disabled={isLoading}
          />
        )}
        <Button
          text={leftButtonText}
          buttonType={leftButtonType || 'secondary'}
          variant="text"
          onClick={leftButtonClickHandler}
          sx={popupStyles.contentText}
          disabled={isLoading}
          loading={isLoading && loadingButtonNumber === 1}
        />
        {showThirdButton && (
          <Button
            text={thirdButtonText}
            onClick={thirdButtonClickHandler}
            variant="contained"
            buttonType={thirdButtonType || 'secondary'}
            sx={popupStyles.contentText}
            disabled={isLoading}
            loading={isLoading && loadingButtonNumber === 2}
          />
        )}
        <Button
          text={rightButtonText}
          onClick={rightButtonClickHandler}
          variant="contained"
          buttonType={rightButtonType || 'secondary'}
          sx={popupStyles.contentText}
          disabled={isLoading}
          loading={isLoading && loadingButtonNumber === (showThirdButton ? 3 : 2)}
        />
      </DialogActions>
    </Dialog>
  );
};

PopUpMessages.propTypes = {
  open: PropTypes.bool.isRequired,
  header: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  leftButtonText: PropTypes.string.isRequired,
  rightButtonText: PropTypes.string.isRequired,
  leftButtonClickHandler: PropTypes.func.isRequired,
  rightButtonClickHandler: PropTypes.func.isRequired,
  leftButtonType: PropTypes.string,
  rightButtonType: PropTypes.string,
  handleOpenLink: PropTypes.func,
  additionanLinkButton: PropTypes.bool,
  thirdButtonText: PropTypes.string,
  thirdButtonClickHandler: PropTypes.func,
  thirdButtonType: PropTypes.string,
  showThirdButton: PropTypes.bool,
  isLoading: PropTypes.bool,
  loadingButtonNumber: PropTypes.oneOf([1, 2, 3]),
  headerSx: PropTypes.object,
  contentrSx: PropTypes.object,
};

export default PopUpMessages;
