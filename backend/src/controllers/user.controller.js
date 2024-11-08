import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils//ApiResponse.js";
import { ApiError } from "../utils//ApiError.js";
import { User } from "../models/user.model.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    //console.log(user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    //console.log(accessToken, refreshToken);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    if (!accessToken && !refreshToken) {
      console.log("Not generated");
      return;
    }
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(400, "Something Went Wrong");
  }
};

const signUp = asyncHandler(async (req, res) => {
  const { username, password, email, role } = req.body;

  //console.log(name, username, password, email);

  if ([username, password, email, role].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required !!");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(400, "Username or email already exists");
  }

  const user = await User.create({
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const createdUser = await User.findById(user._id).select(
    "-refreshToken -password"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong at User Creation !!");
  }

  const options = {
    httpOnly: true,
    sameSite: "Strict",
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, { sameSite: "Strict" })
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User Registered Successfully", {
        user: createdUser,
        accessToken,
        refreshToken,
      })
    );
});

const signIn = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(400, "Invaild Credentails !");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Incorrect Password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    sameSite: "Strict",
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, { sameSite: "Strict" })
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "Sign-In Successfully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

export { signIn, signUp };
