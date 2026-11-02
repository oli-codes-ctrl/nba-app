classdef FINAL_NOKEY < matlab.apps.AppBase

    % Properties that correspond to app components
    properties (Access = public)
        UIFigure                      matlab.ui.Figure
        TabGroup                      matlab.ui.container.TabGroup
        IntroductionTab               matlab.ui.container.Tab
        Image4                        matlab.ui.control.Image
        Image3                        matlab.ui.control.Image
        Label3_4                      matlab.ui.control.Label
        NBA2324APPLabel               matlab.ui.control.Label
        PlayerGraphsTab               matlab.ui.container.Tab
        explanationLabel              matlab.ui.control.Label
        YBinsSlider                   matlab.ui.control.Slider
        YBinsSliderLabel              matlab.ui.control.Label
        XBinsSlider                   matlab.ui.control.Slider
        XBinsSliderLabel              matlab.ui.control.Label
        GRAPHTYPEDropDown             matlab.ui.control.DropDown
        GRAPHTYPEDropDownLabel        matlab.ui.control.Label
        SizeofPointsLabel             matlab.ui.control.Label
        SizeofPointsSlider            matlab.ui.control.Slider
        ColormapDropDown              matlab.ui.control.DropDown
        ColormapDropDownLabel         matlab.ui.control.Label
        GradientDropDown              matlab.ui.control.DropDown
        GradientDropDownLabel         matlab.ui.control.Label
        TargetPlayerColorPicker       matlab.ui.control.ColorPicker
        TargetPlayerColorPickerLabel  matlab.ui.control.Label
        BelowAverageColorPicker       matlab.ui.control.ColorPicker
        BelowAverageColorPickerLabel  matlab.ui.control.Label
        AboveAverageColorPicker       matlab.ui.control.ColorPicker
        AboveAverageColorPickerLabel  matlab.ui.control.Label
        Cbutton                       matlab.ui.control.Button
        otherCbutton                  matlab.ui.control.Button
        RunDataButton                 matlab.ui.control.Button
        yPercentileLabel              matlab.ui.control.Label
        xPercentileLabel              matlab.ui.control.Label
        playerEditField               matlab.ui.control.EditField
        WhatplayerdoyouwanttohighlightEditFieldLabel  matlab.ui.control.Label
        XAXISDropDown                 matlab.ui.control.DropDown
        XAXISDropDownLabel            matlab.ui.control.Label
        YAXISDropDown                 matlab.ui.control.DropDown
        YAXISDropDownLabel            matlab.ui.control.Label
        yGauge                        matlab.ui.control.LinearGauge
        xGauge                        matlab.ui.control.LinearGauge
        efficiencyAxes                matlab.ui.control.UIAxes
        PlayerGuessTab                matlab.ui.container.Tab
        Label3_2                      matlab.ui.control.Label
        punishmentLabel               matlab.ui.control.Label
        punishmentButton              matlab.ui.control.Button
        SuperEasyModeCheckBox         matlab.ui.control.CheckBox
        Cbutton_2                     matlab.ui.control.Button
        otherCbutton_2                matlab.ui.control.Button
        SilhouetteImage               matlab.ui.control.Image
        TeamImage                     matlab.ui.control.Image
        GuessButton                   matlab.ui.control.Button
        HintDropDown                  matlab.ui.control.DropDown
        HintDropDownLabel             matlab.ui.control.Label
        WRONGLabel                    matlab.ui.control.Label
        CORRECTLabel                  matlab.ui.control.Label
        DOUBLEPOINTSLabel             matlab.ui.control.Label
        scoreEditField                matlab.ui.control.NumericEditField
        SCOREEditFieldLabel           matlab.ui.control.Label
        highlightedPlayerEditField    matlab.ui.control.EditField
        WhoisthehighlightedplayerEditFieldLabel  matlab.ui.control.Label
        EasyModeCheckBox              matlab.ui.control.CheckBox
        hintAxes                      matlab.ui.control.UIAxes
        PlayerComparisonTab           matlab.ui.container.Tab
        Label3_3                      matlab.ui.control.Label
        TEAM1EditField                matlab.ui.control.EditField
        TEAM1EditFieldLabel           matlab.ui.control.Label
        TEAM2EditField                matlab.ui.control.EditField
        TEAM2EditFieldLabel           matlab.ui.control.Label
        player2compare                matlab.ui.control.Label
        thanLabel                     matlab.ui.control.Label
        doublepoints                  matlab.ui.control.Label
        player2label                  matlab.ui.control.Label
        fouls2                        matlab.ui.control.EditField
        FoulsEditField_2Label         matlab.ui.control.Label
        apg2                          matlab.ui.control.EditField
        APGEditField_5Label           matlab.ui.control.Label
        spg2                          matlab.ui.control.EditField
        SPGEditField_2Label           matlab.ui.control.Label
        bpg2                          matlab.ui.control.EditField
        BPGEditField_2Label           matlab.ui.control.Label
        ppg2                          matlab.ui.control.EditField
        PPGEditField_2Label           matlab.ui.control.Label
        fouls1                        matlab.ui.control.EditField
        FoulsEditFieldLabel           matlab.ui.control.Label
        apg1                          matlab.ui.control.EditField
        APGEditField_4Label           matlab.ui.control.Label
        spg1                          matlab.ui.control.EditField
        SPGEditFieldLabel             matlab.ui.control.Label
        bpg1                          matlab.ui.control.EditField
        BPGEditFieldLabel             matlab.ui.control.Label
        ppg1                          matlab.ui.control.EditField
        PPGEditFieldLabel             matlab.ui.control.Label
        player1label                  matlab.ui.control.Label
        score                         matlab.ui.control.NumericEditField
        ScoreEditFieldLabel           matlab.ui.control.Label
        submit                        matlab.ui.control.Button
        spg                           matlab.ui.control.CheckBox
        fouls                         matlab.ui.control.CheckBox
        ppg                           matlab.ui.control.CheckBox
        bpg                           matlab.ui.control.CheckBox
        apg                           matlab.ui.control.CheckBox
        havemoreLabel                 matlab.ui.control.Label
        player1compare                matlab.ui.control.Label
        DoesLabel                     matlab.ui.control.Label
        Image2                        matlab.ui.control.Image
        player2                       matlab.ui.control.Label
        Image                         matlab.ui.control.Image
        player1                       matlab.ui.control.Label
        reset                         matlab.ui.control.Button
        newround                      matlab.ui.control.Button
        KeyTab                        matlab.ui.container.Tab
        Label_2                       matlab.ui.control.Label
        Label                         matlab.ui.control.Label
        CHECKBOXESAPGAssisstpergamePPGPointspergameLabel  matlab.ui.control.Label
        HINTSLabel                    matlab.ui.control.Label
        Label3_5                      matlab.ui.control.Label
        YAXISPTSLabel                 matlab.ui.control.Label
        TAB2PlayerGraphsLabel         matlab.ui.control.Label
        TAB4PlayerComparisonLabel     matlab.ui.control.Label
        TAB3PlayerGuessLabel          matlab.ui.control.Label
        XAXISAgeAgeGGamePlayedGSGamesStartedPFPersonalFoulsLabel  matlab.ui.control.Label
    end

    properties(Access = public)
        fullData % data set
        importantX % x for tab 1
        importantY % y for tab 1
        importantZ % gradient for tab 1
        importantXtab2 % x for tab 2
        importantYtab2 % y for tab 2
        targetPlayer % target player for tab 1
        nRows % rows
        nCols % columns
        x % x VALUES for tab 1
        y % y VALUES for tab 1
        z % gradient VALUES for tab 1
        count % count for easy and super easy mode on / off - prevent cheating
        cb % colorbar, allows for label on colorbar
        xtab2 % x VALUES for tab 2
        ytab2 % y VALUES for tab 2
        highX % x values for above average y values tab 1
        highY % above average y values tab 1
        lowX % x values for below average y values tab 1
        lowY % below average y values tab 1
        bestfitY % line of best fit tab 1
        names % set of names
        j % random index for selecting player to guess tab 2
        targetName % name of player to guess tab 2
        teamPics % set of every actual team pic to display 
        teams % set of teams
        PicTeams % set of strings in parallel to teamPics with names of teams
        Silhouettes % set of silhouettes of players
        punishmentCount % count of how many times punishment button has been pushed
        correctCounter % initializes correct counter 
        compareGame % starts comapare vector
        doublepts % allows double points for player compare to be accessed by every function

    end
    methods (Access = private)
    %% Function for plotting line of best fit graph
    function plotData(app)
    [app.nRows,app.nCols] = size(app.fullData); % initialize rows and columns
        % check to see if drop down is offense / defense
        if ~ strcmpi(app.importantY, "OFFENSE") && ~ strcmpi(app.importantY, "DEFENSE") 
        % if neither, x and y axis are drop down values - which are titles
        % in data
            app.importantX = app.XAXISDropDown.Value;
            app.importantY = app.YAXISDropDown.Value;
        % values of x and y come directly from data set
            app.x = app.fullData{:, app.importantX};
            app.y = app.fullData{:, app.importantY};
        elseif strcmpi(app.YAXISDropDown.Value, "OFFENSE")
            % if offense, x is still x. but y is calculated manually
            app.x = app.fullData{:, app.importantX};
            for i = 1:app.nRows
            app.y =  app.fullData{:,"PTS"}.*app.fullData{:,"eFG_"}+app.fullData{:,"AST"} +...
            app.fullData{:,"ORB"} + app.fullData{:,"x3P"}.*app.fullData{:,"x3P_"} + app.fullData{:,"FT"}.*app.fullData{:,"FT_"} +...
            - app.fullData{:,"TOV"};
            end
            app.importantY = "OFFENSE"; % for labelling purposes
        elseif strcmpi(app.importantY, "DEFENSE") 
            % if defense, x is still x, but y is calculated manually
            app.x = app.fullData{:, app.importantX};
            for i = 1:app.nRows
            app.y = app.fullData{:,"DRB"} + app.fullData{:,"STL"} + app.fullData{:,"BLK"} - app.fullData{:,"PF"};
            app.importantY = "Defense"; % for labelling purposes
            end
        end

    % transform all y which is nan to the mean of all other y's
    app.y(isnan(app.y)) = mean(app.y(~isnan(app.y)));  

    % transform percentages to numeric values 1 - 100
    if max(app.y) <= 1
        app.y = app.y*100;
    end

    % create line of best fit using polyfit and polyval - found in matlab
    % help center
    coefficients = polyfit(app.x, app.y, 1);
    app.bestfitY = polyval(coefficients, app.x);

    % high index is all y's where the value is > than the line of best fit;
    % low index is not high index
    highIndex = app.y >= app.bestfitY;
    lowIndex = ~highIndex;

    % seperate high and low x and y based on high and low index
    app.highX = app.x(highIndex);
    app.highY = app.y(highIndex);
    app.lowX = app.x(lowIndex);
    app.lowY = app.y(lowIndex);

    % clear aces, hold on
    cla(app.efficiencyAxes);
    hold(app.efficiencyAxes, 'on');
    % plot high x / y with selected high color
    plot(app.efficiencyAxes, app.highX, app.highY, 'o',MarkerFaceColor=app.AboveAverageColorPicker.Value,MarkerSize = 4)
    % plot low x / y with selected low color
    plot(app.efficiencyAxes,app.lowX, app.lowY, 'o',MarkerFaceColor = app.BelowAverageColorPicker.Value,MarkerSize=4)
    % plot line of best fit as black line
    plot(app.efficiencyAxes,app.x, app.bestfitY, 'k-')
    hold(app.efficiencyAxes, 'off');

    % label and titles based on drop downs
    xlabel(app.efficiencyAxes, app.importantX);
    ylabel(app.efficiencyAxes, app.importantY);
    title(app.efficiencyAxes, app.importantX + " vs. " + app.importantY);

    % grid on. x and y limits for aesthetic purposes
    grid(app.efficiencyAxes, 'on');
    xlim(app.efficiencyAxes, [min(app.x), max(app.x) + 1]); 
    ylim(app.efficiencyAxes, [min(app.y), max(app.y) + 1]);
    
    % legend on
    legend(app.efficiencyAxes, "High " + app.importantY, "Low " + app.importantY, "Best Fit", 'Location', 'bestoutside');
    end
    
    %% Function for plotting selected player
    function playerPlot(app)
        % clear axes
        cla(app.efficiencyAxes)
        
        % target player is value of text edit field
        app.targetPlayer = app.playerEditField.Value;

        % check for offense and defense
        if ~ strcmpi(app.importantY, "OFFENSE") && ~ strcmpi(app.importantY, "DEFENSE") 
            % if neither, x and y are values of drop down - same as table
            % titles
            app.importantX = app.XAXISDropDown.Value;
            app.importantY = app.YAXISDropDown.Value;
            % data comes straight from table
            app.x = app.fullData{:, app.importantX};
            app.y = app.fullData{:, app.importantY};
        elseif strcmpi(app.YAXISDropDown.Value, "OFFENSE")
            % if offense, x is still x, y is calculated manually
            app.x = app.fullData{:, app.importantX};
            for i = 1:app.nRows
            app.y =  app.fullData{:,"PTS"}.*app.fullData{:,"eFG_"}+app.fullData{:,"AST"} +...
            app.fullData{:,"ORB"} + app.fullData{:,"x3P"}.*app.fullData{:,"x3P_"} + app.fullData{:,"FT"}.*app.fullData{:,"FT_"} +...
            - app.fullData{:,"TOV"};
            end
            app.importantY = "OFFENSE"; % for labelling purposes
        elseif strcmpi(app.importantY, "DEFENSE") 
            % if defense, x is still x, y is calculated manually
            app.x = app.fullData{:, app.importantX};
            for i = 1:app.nRows
            app.y = app.fullData{:,"DRB"} + app.fullData{:,"STL"} + app.fullData{:,"BLK"} - app.fullData{:,"PF"};
            app.importantY = "Defense"; % for labelling purposes
            end
        end
        
        % transform all nan to mean of all non nan
        app.y(isnan(app.y)) = mean(app.y(~isnan(app.y)));
        targetRow = -inf; % initialized target row check

        % for loop to find target players index and their appropriate x and
        % y values
        for i = 1:app.nRows
            if strcmpi(app.targetPlayer,app.fullData{i,"Player"})
               targetRow = i;
               targetX = app.x(targetRow);
               targetY = app.y(targetRow);
            end
        end

        % transform percentages y's to values 1 - 100
        if targetRow > 0
        if max(app.y) <= 1
            targetY = targetY * 100;
            app.y = app.y*100;
        end
        end 

        % only plot if target row greater than 0; reason for check at
        % beginning
        if targetRow > 0
            cla(app.efficiencyAxes) % clear axes
            hold(app.efficiencyAxes,"on")
        if app.GRAPHTYPEDropDown.Value == "Best Fit" % use best fit line logic if graph is best fit - found above
            plot(app.efficiencyAxes, app.highX, app.highY, 'o',MarkerFaceColor=app.AboveAverageColorPicker.Value,MarkerSize = 4)
            plot(app.efficiencyAxes,app.lowX, app.lowY, 'o',MarkerFaceColor = app.BelowAverageColorPicker.Value,MarkerSize = 4)
            plot(app.efficiencyAxes,app.x, app.bestfitY, 'k-')
            % plot square for target player in the color which is picked
            plot(app.efficiencyAxes,targetX,targetY,"s",MarkerSize=8,MarkerFaceColor=app.TargetPlayerColorPicker.Value)
            legend(app.efficiencyAxes, "High " + app.importantY, "Low " + app.importantY, "Best Fit", app.targetPlayer, 'Location', 'bestoutside');
        else % use gradient logic for gradient drop down - found in gradientPlot function
            scatter(app.efficiencyAxes,app.x,app.y,app.SizeofPointsSlider.Value,app.z,'filled')
            hold(app.efficiencyAxes,"on")
            colormap(app.efficiencyAxes,app.ColormapDropDown.Value)
            app.cb = colorbar(app.efficiencyAxes);
            xlabel(app.efficiencyAxes,app.importantX)
            ylabel(app.efficiencyAxes,app.importantY)
            ylabel(app.cb,app.importantZ,FontSize=15)
            title(app.efficiencyAxes,string(app.importantX) + ' vs. ' + string(app.importantY))
            xlim(app.efficiencyAxes, [min(app.x), max(app.x) + 1]); 
            % plot black circle for target player which is 2.5 times the size
            % of other points
            scatter(app.efficiencyAxes,targetX,targetY,2.5*app.SizeofPointsSlider.Value,'k','filled')
            legend(app.efficiencyAxes,app.importantY,app.targetPlayer)
        end

       


        % calculated averages and standard deviations for x and y
        averageX = mean(app.x);
        stdX = std(app.x);
        averageY = mean(app.y);
        stdY = std(app.y);
        % label the gauges
        app.yPercentileLabel.Text = app.importantY + " Percentile";
        app.xPercentileLabel.Text = app.importantX + " Percentile";
        
        % if stdx = 0, automatically make it 0.5 to debug
        if stdX == 0
             xPercentile = 0.5; 
        else
        % else, calculate z score and x percentile - NEED STATISTICS AND
        % MACHINE LEARNING TOOLBOX
            Xzscore = (targetX - averageX) / stdX;
            xPercentile = normcdf(Xzscore);
        end

        % if stdy = 0, automatically make it 0.5 to debug
        if stdY == 0
            yPercentile = 0.5;
        else
        % else, calculate z score and y percentile - NEED STATISTICS AND
        % MACHINE LEARNING TOOLBOX
            Yzscore = (targetY - averageY) / stdY;
            yPercentile = normcdf(Yzscore);
        end

        % display percentiles on gauges after changing them to values 1 -
        % 100
        app.xGauge.Value = xPercentile * 100;
        app.yGauge.Value = yPercentile * 100;
        end
    end
    
    %% Function for plotting hints in tab 2
    function guessPlot(app)
            app.importantXtab2 = "Age"; % x axis is always age
            app.importantYtab2 = app.HintDropDown.Value; % y axis is hint drop down
            app.xtab2 = app.fullData{:,app.importantXtab2}; 
            app.ytab2 = app.fullData{:,app.importantYtab2};
            app.names = app.fullData{:,"Player"}; % names is all players
            app.teams = app.fullData{:,"Team"}; % teams are all teams
            check = false; % initialize check
            while check == false
                check = true; % set to true before bubble sort
                for i =1:app.nRows-1
                    % bubble sort y tab; keep x, name, and team sorted in
                    % the same pattern
                    if app.ytab2(i) < app.ytab2(i+1)
                        temp = app.ytab2(i);
                        app.ytab2(i) = app.ytab2(i+1);
                        app.ytab2(i+1) = temp;
                        temp2 = app.xtab2(i);
                        app.xtab2(i) = app.xtab2(i+1);
                        app.xtab2(i+1) = temp2;
                        temp3 = app.names{i};
                        app.names{i} = app.names{i+1};
                        app.names{i+1} = temp3;
                        temp4 = app.teams{i};
                        app.teams{i} = app.teams{i+1};
                        app.teams{i+1} = temp4;
                        check = false;
                    end
                end
            end
            % loop through to find target name in string of names
            for i = 1:app.nRows
                if strcmpi(string(app.names{i}),app.targetName)
                    n = i + randi(15); % when the same, n is row value plus
                    % up to 15 rows - serves to create more uniqueness in
                    % each game
                    targetX = app.xtab2(i); % target x for graphing is x of row
                    targetY = app.ytab2(i); % target y for graphing is y of row
                    break
                end
            end
            topX = app.xtab2(1:n); % plot all these x's, up to 15 beyond player
            topY = app.ytab2(1:n); % plot all these y's, up to 15 beyond player
            cla(app.hintAxes) % clear axes
            plot(app.hintAxes,topX,topY,'mo') % plot players as unfilled magenta circles
            hold(app.hintAxes,"on") % hold graph
            % plot target player as filled in r circle
            plot(app.hintAxes,targetX,targetY,'ro','MarkerSize',8,'MarkerFaceColor','r')
            % labels, title, x and y limits for aesthetics
            xlabel(app.hintAxes,app.importantXtab2) 
            ylabel(app.hintAxes,app.importantYtab2)
            title(app.hintAxes, app.importantYtab2 + " vs. " + app.importantXtab2)
            legend(app.hintAxes,'League PPG Leaders','You Tell Me','Location','best')
            xlim(app.hintAxes,([min(topX)-1 max(topX)+1]))
            ylim(app.hintAxes,([min(topY)-1 max(topY)+1]))
    end

    %% Functyion for plotting gradient
    function gradientPlot(app)
         % check for offense and defense
        if ~ strcmpi(app.importantY, "OFFENSE") && ~ strcmpi(app.importantY, "DEFENSE") 
            % if neither, x and y are values of drop down - same as table
            % titles
            app.importantX = app.XAXISDropDown.Value;
            app.importantY = app.YAXISDropDown.Value;
            % data comes straight from table
            app.x = app.fullData{:, app.importantX};
            app.y = app.fullData{:, app.importantY};
        elseif strcmpi(app.YAXISDropDown.Value, "OFFENSE")
            % if offense, x is still x, y is calculated manually
            app.x = app.fullData{:, app.importantX};
            for i = 1:app.nRows
            app.y =  app.fullData{:,"PTS"}.*app.fullData{:,"eFG_"}+app.fullData{:,"AST"} +...
            app.fullData{:,"ORB"} + app.fullData{:,"x3P"}.*app.fullData{:,"x3P_"} + app.fullData{:,"FT"}.*app.fullData{:,"FT_"} +...
            - app.fullData{:,"TOV"};
            end
            app.importantY = "OFFENSE"; % for labelling purposes
        elseif strcmpi(app.importantY, "DEFENSE") 
            % if defense, x is still x, y is calculated manually
            app.x = app.fullData{:, app.importantX};
            for i = 1:app.nRows
            app.y = app.fullData{:,"DRB"} + app.fullData{:,"STL"} + app.fullData{:,"BLK"} - app.fullData{:,"PF"};
            app.importantY = "Defense"; % for labelling purposes
            end
        end

        % intialize z axis - serves as color gradient variable
        app.importantZ = app.GradientDropDown.Value;
        app.z = app.fullData{:,app.importantZ};
    
        % transform x and y nan values to mean of non nan z and y values
        app.z(isnan(app.z)) = mean(app.z(~isnan(app.z)));
        app.y(isnan(app.y)) = mean(app.y(~isnan(app.y)));  

        % convert percentage y values into values 1 - 100
        if max(app.y) <= 1
            app.y = app.y*100;
        end

        cla(app.efficiencyAxes); % clear axes
        % plot scatter plot with x, y in size of points. z is after so the
        % gradient will work
        scatter(app.efficiencyAxes,app.x,app.y,app.SizeofPointsSlider.Value,app.z,'filled')
        hold(app.efficiencyAxes,"on") % hold axes on
         % plot colormap onto graph, colormap is selected from drop down
        colormap(app.efficiencyAxes,app.ColormapDropDown.Value)
        app.cb = colorbar(app.efficiencyAxes); % create colorbar inherent to app
        % x and y labels
        xlabel(app.efficiencyAxes,app.importantX) 
        ylabel(app.efficiencyAxes,app.importantY)
        % label for colorbar, aka gradient label
        ylabel(app.cb,app.importantZ,FontSize=15)
        % title and legend, x and y limits for aesthetics
        title(app.efficiencyAxes,string(app.importantX) + ' vs. ' + string(app.importantY))
        legend(app.efficiencyAxes,app.importantY)
        xlim(app.efficiencyAxes, [min(app.x), max(app.x) + 1]); 
        ylim(app.efficiencyAxes, [min(app.y), max(app.y) + 1]);
       
    end

    %% Function for when player is suspected of cheating tab 2
    function punishment(app)
   
    % turn off guess button and dislay punishemtn button
    app.GuessButton.Visible = "off";
    app.punishmentLabel.Visible = "on";
    app.punishmentButton.Visible = "on";

    % intialize punishment count
    app.punishmentCount = 0;  

    % keep going until button pushed 25 times
    while app.punishmentCount < 25
        drawnow; % draw new value of punishment count after checking
    end

    % dislpay guess button, turn off punishemtn button, and reset count
    % after punishment is done
    app.punishmentLabel.Visible = "off";
    app.punishmentButton.Visible = "off";
    app.GuessButton.Visible = "on";
    app.count = 0;
    end

 %% Function for tile plot - tab 1
 function tilePlot(app)
      % check for offense and defense
      if ~ strcmpi(app.importantY, "OFFENSE") && ~ strcmpi(app.importantY, "DEFENSE") 
          % if neither, x and y are values of drop down - same as table
          % titles
          app.importantX = app.XAXISDropDown.Value;
          app.importantY = app.YAXISDropDown.Value;
          % data comes straight from table
          app.x = app.fullData{:, app.importantX};
          app.y = app.fullData{:, app.importantY};
      elseif strcmpi(app.YAXISDropDown.Value, "OFFENSE")
          % if offense, x is still x, y is calculated manually
          app.x = app.fullData{:, app.importantX};
          for i = 1:app.nRows
          app.y =  app.fullData{:,"PTS"}.*app.fullData{:,"eFG_"}+app.fullData{:,"AST"} +...
          app.fullData{:,"ORB"} + app.fullData{:,"x3P"}.*app.fullData{:,"x3P_"} + app.fullData{:,"FT"}.*app.fullData{:,"FT_"} +...
          - app.fullData{:,"TOV"};
          end
          app.importantY = "OFFENSE"; % for labelling purposes
     elseif strcmpi(app.importantY, "DEFENSE") 
          % if defense, x is still x, y is calculated manually
          app.x = app.fullData{:, app.importantX};
          for i = 1:app.nRows
          app.y = app.fullData{:,"DRB"} + app.fullData{:,"STL"} + app.fullData{:,"BLK"} - app.fullData{:,"PF"};
          app.importantY = "Defense"; % for labelling purposes
          end
     end
    
    % transform all nan y to mean of non nan y
    app.y(isnan(app.y)) = mean(app.y(~isnan(app.y)));

    % transform percentage y to value 1 - 100
    if max(app.y) <= 1
        app.y = app.y * 100;
    end

    % clear axes
    cla(app.efficiencyAxes)
    ShowEmptyBins = false; % dont show empty bins

    % plot histogram - found in matlab plot gallery
    histogram2(app.efficiencyAxes, ...
        app.x, ... % x values
        app.y, ... % y values
        "DisplayStyle", "tile", ... % dislay as tiles
        "ShowEmptyBins", ShowEmptyBins, ... % do not show empty bins
        "NumBins", [round(app.XBinsSlider.Value), round(app.YBinsSlider.Value)]); 
        % number of bins is values of sliders rounded - will not work
        % without round

    % x lim for aesthetics
    xlim(app.efficiencyAxes, [min(app.x), max(app.x) + 1]);

    % y lim for aesthetics
    ylim(app.efficiencyAxes, [min(app.y), max(app.y) + 1]);
    
    % colromap is value of drop down for tile plot
    colormap(app.efficiencyAxes, app.ColormapDropDown.Value)

    % x and y label
    xlabel(app.efficiencyAxes, app.importantX)
    ylabel(app.efficiencyAxes, app.importantY)

    % colorbar show snumber of players, so show that on colorbar label
    app.cb = colorbar(app.efficiencyAxes);
    ylabel(app.cb, "Number of Players");

    % title
    title(app.efficiencyAxes, ...
        "Player counts based on " + app.importantX + " and " + app.importantY)
    legend(app.efficiencyAxes,"Player Counts")
 end


 %% Player Compare - tab 3
    function playerCompare(app) % starts startup player compare app
        app.apg1.Value = " ";
        app.ppg1.Value = " ";
        app.spg1.Value = " "; % sets all edit fields to empty
        app.bpg1.Value = " ";
        app.fouls1.Value = " ";

        app.apg2.Value = " ";
        app.ppg2.Value = " ";
        app.spg2.Value = " ";
        app.bpg2.Value = " ";
        app.fouls2.Value = " ";

        for i = 1:app.nRows 
            if app.fullData{i,'MP'} >= 30 % goes through data, if the player has more than 30 min player per game
                % saves them in a new vector to allow impact players being
                % the only ones compared
                minuteData{i} = app.fullData{i,'Player'}; % saves their name
            else 
                minuteData{i} = "0"; % if its not above 30, save 0
            end
        end
        whileTrue = true; % starts loop

        while whileTrue
            player1Val = randi([1 100]); % generates random num for player 1
            player2Val = randi([1 100]);  % generates random num for player 2
            if strcmp(minuteData{player1Val},"0") || strcmp(minuteData{player2Val},"0")
                whileTrue = true; % if the minutes played vector has a 0 for their name
                % it means that they do not have more than 3 min per game
                % played
                % this keeps looping through finding new players until both
                % of them have more than 30 min per game played
            
            else 
                whileTrue = false; % exits

            end
        end

        app.player1.Text = app.fullData{player1Val, 'Player'}; % sets player names on labels
        app.player1compare.Text = app.fullData{player1Val, 'Player'};
        app.player2.Text = app.fullData{player2Val, 'Player'};
        app.player2compare.Text = app.fullData{player2Val, 'Player'};

        if player1Val* player2Val > 2000 % controls double points
            % if the player ranks multiplied is greater than an arbitrary
            % 2k (NBA 2k), then turn on double points, and double points
            % header
           
            app.doublepoints.Visible = "on";
            app.doublepts = true;
        else  
            app.doublepoints.Visible = "off";
            app.doublepts = false;

                
        end
        app.compareGame{1,1} = app.fullData{player1Val, 'Player'}; % sets up new compare
        % vectors so that the two players stats can be easily compared
        app.compareGame{2,1} = app.fullData{player1Val, 'AST'};
        app.compareGame{3,1} = app.fullData{player1Val, 'PTS'};
        app.compareGame{4,1} = app.fullData{player1Val, 'STL'};
        app.compareGame{5,1} = app.fullData{player1Val, 'BLK'};
        app.compareGame{6,1} = app.fullData{player1Val, 'PF'};

        app.compareGame{1,2} = app.fullData{player2Val, 'Player'};
        app.compareGame{2,2} = app.fullData{player2Val, 'AST'};
        app.compareGame{3,2} = app.fullData{player2Val, 'PTS'};
        app.compareGame{4,2} = app.fullData{player2Val, 'STL'};
        app.compareGame{5,2} = app.fullData{player2Val, 'BLK'};
        app.compareGame{6,2} = app.fullData{player2Val, 'PF'};
       
            PHI = imread("PHILLY.JPG"); % sets up tem jpgs here because it bugs out when it exists only in
                % the startup function
            DAL = imread("MAVS.jpg");
            MIL = imread("BUCKS.jpg");
            OKC = imread("THUNDER.jpg");
            NYK = imread("KNICKS.jpg");
            PHO = imread("SUNS.jpg");
            BOS = imread("CELTICS.jpg");
            CLE = imread("CAVS.jpg");
            SAC = imread("KINGS.jpg");
            DEN = imread("NUGGETS.jpg");
            GSW = imread("WARRIORS.jpg");
            MIN = imread("TWOLVES.jpg");
            ATL = imread("HAWSK.jpg");
            LAL = imread("LAKERS.jpg");
            MEM = imread("GRIZZLIES.jpg");
            NOP = imread("PELICANS.jpg");
            DET = imread("PISTONS.jpg");
            CHO = imread("HORNETS.jpg");
            UTA = imread("JAZZ.jpg");
            ORL = imread("MAGIC.jpg");
            HOU = imread("ROCKETS.jpg");
            BRK = imread("NETS.jpg");
            TOR = imread("RAPTORS.jpg");
            WAS = imread("WIZARDS.jpg");
            POR = imread("TRAILBLAZERS.jpg");
            IND = imread("PACERS.jpg");
            MIA = imread("HEAT.jpg");
            CHI = imread("BULLS.jpg");
            LAC = imread("CLIPPERS.jpg");
            SAS = imread("SPURS.jpg");



        % sets up team banners to be called on when the excel values get
        % compared - cannot do a striaght up compare with values on excel
        % sheet because MATLab does not allow going through files that way
        

        
        app.teamPics = {PHI,DAL,MIL,OKC,NYK,PHO,BOS,CLE,SAC,DEN,GSW,MIN,...
                ATL,LAL,MEM,NOP,DET,CHO,UTA,ORL,HOU,BRK,TOR,WAS,POR,IND,MIA,CHI,LAC,SAS};


        % sets up the string version of the previous. Allows for indexing
        % through of the image names. Allows for string compare of the
        % various images, to make sure the player rank is associated with
        % the right image
      

        app.PicTeams = {"PHI","DAL","MIL","OKC","NYK","PHO","BOS","CLE",...
                "SAC","DEN","GSW","MIN","ATL","LAL","MEM","NOP","DET","CHO",...
                "UTA","ORL","HOU","BRK","TOR","WAS","POR","IND","MIA","CHI","LAC","SAS"};
        n1 = 1; % sets up initial counter for player1 that have played for more 
        %than one team
        n2 = 1;% sets up initial counter for player2 that have played for more than
        % one team
    

        % whole next part has redundacy for if a player has more than one
        % team played for

        for i = 1:app.nRows % goes through full data to find player
            if strcmpi(app.fullData{i,"Player"},app.compareGame{1,1})
                targetIndex1(n1) = i; % if there are multiple values that a team has played for
                % add n1 value to be 2 teams, or 3 teams
                n1 = n1 + 1;
            end
        end
        for i = 1:length(targetIndex1)
            if ~ strcmpi(targetIndex1(i),"2TM") || ~strcmpi(targetIndex1(i),"3TM")
                newTargetIndex = targetIndex1(i); % goes through the vector 
                % that has if a player has played for more than one team, 
                % if the team is not equal to 2Tm or 3Tm, then it
                % saves the other team as the one that will be found for
                % the images. Ex. RJ Barret's vector will look like 
                % TOR
                % 2TM
                % Only save the TOR part as the index of the image
            end
        end

        for j2 = 1:app.nRows
            if strcmpi(app.fullData{j2,"Player"},app.compareGame{1,2})
                targetIndex2(n2) = j2;
                n2 = n2 + 1; 
                % same logic as above but for player 2
            end
        end
        for i = 1:length(targetIndex2)
            if ~strcmpi(targetIndex2(i),"2TM") || ~strcmpi(targetIndex2(i),"3TM")
                newTargetIndex2 = targetIndex2(i);
                % same logic as above but for player 2
            end
        end

        % finds the index for the original spreadsheet
        % finds team name. Ex. "MEM"
        targetTeam1 = app.fullData{newTargetIndex,"Team"};
        targetTeam2 = app.fullData{newTargetIndex2,"Team"};
        

        % goes through each PicTeam string, and if the player team value is equal to the
        % string thaat is naming it, then save the index of where the value
        % is in PicTeams
        for iL = 1:30
                if strcmpi(string(app.PicTeams(iL)), string(targetTeam1))
                    targetTeam1Index = iL;
                    break
                end
        end
        for iA = 1:30  % same logic as before but for player 2
                if strcmpi(string(app.PicTeams(iA)), string(targetTeam2))
                    targetTeam2Index = iA;
                    break
                end
        end
        
        % Sets the edit field values so that you can see what the team is
        % in letters
        app.TEAM1EditField.Value = string(targetTeam1);
        app.TEAM2EditField.Value = string(targetTeam2);

        app.Image.ImageSource = app.teamPics{targetTeam1Index}; % finally, prints image
        %onto image 1 space
        app.Image.ScaleMethod = "fit"; % makes sure the fit is proper
        

        % same logic as above but for image 2
        app.Image2.ImageSource = app.teamPics{targetTeam2Index}; 
        app.Image2.ScaleMethod = "fit";

    end

    %% Submit Button Function Player Compare

    function submitfunc(app) 
        userInput{1} = app.apg.Value; % saves each checkbox as a vector to be compared
        userInput{2} = app.ppg.Value;
        userInput{3} = app.spg.Value;
        userInput{4} = app.bpg.Value;
        userInput{5} = app.fouls.Value;

    app.apg1.Value = string(app.compareGame{2,1}); % once submitted, displays stats in bottom left and right corner
    app.ppg1.Value = string(app.compareGame{3,1});
    app.spg1.Value = string(app.compareGame{4,1});
    app.bpg1.Value = string(app.compareGame{5,1});
    app.fouls1.Value = string(app.compareGame{6,1});

    app.apg2.Value = string(app.compareGame{2,2}); % same as above 
    app.ppg2.Value = string(app.compareGame{3,2});
    app.spg2.Value = string(app.compareGame{4,2});
    app.bpg2.Value = string(app.compareGame{5,2});
    app.fouls2.Value = string(app.compareGame{6,2});

    

    for iV = 2:6 % starts at 2 to not index through names, then goes through the 
        % following 5 values
        if userInput{iV-1} == true && app.compareGame{iV,2} <= app.compareGame{iV,1} 
            % if the value of the user check box input is true, and player 1 has higher stats then
            % player 2
           if app.doublepts == 1 % check for double points
               app.correctCounter = app.correctCounter + 2; % add to counter
           elseif app.doublepts == 0 
               app.correctCounter = app.correctCounter + 1;
           end

        elseif userInput{iV-1} == false && app.compareGame{iV,2} >= app.compareGame{iV,1}
             % if the value of the user check box input is false, and player 1 has lower stats then
            % player 2
            if app.doublepts == 1 % check for double points
               app.correctCounter = app.correctCounter + 2; % add to counter
           elseif app.doublepts == 0 
               app.correctCounter = app.correctCounter + 1;
            end
        else
            app.correctCounter = app.correctCounter - 1; % if its not one of 
            % those two, then the user got it wrong. Subtract 1 for every
            % one they got wrong
        end
    end
    app.score.Value =  app.correctCounter; % sets the score counter to the correct value 
    % after every run


    end
    end

    % Callbacks that handle component events
    methods (Access = private)

        % Code that executes after component creation
        function startupFcn(app)
            app.fullData = readtable("NBA 23-24.xlsx"); % initialize data
            app.correctCounter = 0; % intiailize correct counter
            [app.nRows,app.nCols] = size(app.fullData); % initialize rows and columns
            app.importantX = app.XAXISDropDown.Value; % set important X
            app.importantY = app.YAXISDropDown.Value; % set important Y
            app.gradientPlot() % run gradient function
            % x and y percentile labels
            app.xPercentileLabel.Text = app.importantX + " Percentile ";
            app.yPercentileLabel.Text = app.importantY + " Percentile ";
            app.importantXtab2 = "Age"; % tab 2 x is age
            app.importantYtab2 = app.HintDropDown.Value; % tab 2 y is drop down
            app.names = app.fullData{:,"Player"}; % intializes names
            app.j = randi(20); % intiailize selection for random top 20 ppg player - tab 2
            % intiialize x and y for tab 2
            app.xtab2 = app.fullData{:,app.importantXtab2};
            app.ytab2 = app.fullData{:,app.importantYtab2};
            app.teams = app.fullData{:,"Team"}; % initialize teams
            app.playerCompare() % run player compare function
            %% TEAMS
            PHI = imread("PHILLY.JPG");
            DAL = imread("MAVS.jpg");
            MIL = imread("BUCKS.jpg");
            OKC = imread("THUNDER.jpg");
            NYK = imread("KNICKS.jpg");
            PHO = imread("SUNS.jpg");
            BOS = imread("CELTICS.jpg");
            CLE = imread("CAVS.jpg");
            SAC = imread("KINGS.jpg");
            DEN = imread("NUGGETS.jpg");
            GSW = imread("WARRIORS.jpg");
            MIN = imread("TWOLVES.jpg");
            ATL = imread("HAWSK.jpg");
            LAL = imread("LAKERS.jpg");
            MEM = imread("GRIZZLIES.jpg");
            NOP = imread("PELICANS.jpg");
            DET = imread("PISTONS.jpg");
            CHO = imread("HORNETS.jpg");
            UTA = imread("JAZZ.jpg");
            ORL = imread("MAGIC.jpg");
            HOU = imread("ROCKETS.jpg");
            BRK = imread("NETS.jpg");
            TOR = imread("RAPTORS.jpg");
            WAS = imread("WIZARDS.jpg");
            POR = imread("TRAILBLAZERS.jpg");
            IND = imread("PACERS.jpg");
            MIA = imread("HEAT.jpg");
            CHI = imread("BULLS.jpg");
            LAC = imread("CLIPPERS.jpg");
            SAS = imread("SPURS.jpg");
            
            % create parallel arrays - necessary for display logic
            % one with pics uploaded
            app.teamPics = {PHI,DAL,MIL,OKC,NYK,PHO,BOS,CLE,SAC,DEN,GSW,MIN,...
                ATL,LAL,MEM,NOP,DET,CHO,UTA,ORL,HOU,BRK,TOR,WAS,POR,IND,MIA,CHI,LAC,SAS};
            % one with strings of team names 
            app.PicTeams = {"PHI","DAL","MIL","OKC","NYK","PHO","BOS","CLE",...
                "SAC","DEN","GSW","MIN","ATL","LAL","MEM","NOP","DET","CHO",...
                "UTA","ORL","HOU","BRK","TOR","WAS","POR","IND","MIA","CHI","LAC","SAS"};
            %% PLAYERS
            EMBIID = imread("EMBIID.jpg");
            DONCIC = imread("DONCIC.jpg");
            GIANNIS = imread("GIANNIS.jpg");
            SGA = imread("SGA.jpg");
            BRUNSON = imread("BRUNSON.jpg");
            BOOKER = imread("BOOKER.jpg");
            DURANT = imread("DURANT.jpg");
            TATUM = imread("TATUM.jpg");
            DONOVAN = imread("MITCHELL.jpg");
            FOX = imread("FOX.jpg");
            JOKIC = imread("JOKIC.jpg");
            CURRY = imread("CURRY.jpg");
            ANTMAN = imread("ANTMAN.jpg");
            MAXEY = imread("MAXEY.jpg");
            TRAE = imread("YOUNG.jpg");
            LEBRON = imread("LEBRON.jpg");
            IRVING = imread("IRVING.jpg");
            JA = imread("MORANT.jpg");
            AD = imread("BROW.jpg");
            LILLARD = imread("DAME.jpg");
            % create array of player pics - MUST BE IN ORDER
            app.Silhouettes = {EMBIID,DONCIC,GIANNIS,SGA,BRUNSON,BOOKER,DURANT,TATUM,DONOVAN, + ...
            FOX,JOKIC,CURRY,ANTMAN,MAXEY,TRAE,LEBRON,IRVING,JA,AD,LILLARD};

            % initialize count 
            app.count = 0; 
            check = false; % set check
            % bubble sort for tab 2 based on y - make sure team, name, and
            % x stay connected too
            while check == false
                check = true;
                for i =1:app.nRows-1
                    if app.ytab2(i) < app.ytab2(i+1)
                        temp = app.ytab2(i);
                        app.ytab2(i) = app.ytab2(i+1);
                        app.ytab2(i+1) = temp;
                        temp2 = app.xtab2(i);
                        app.xtab2(i) = app.xtab2(i+1);
                        app.xtab2(i+1) = temp2;
                        temp3 = app.names{i};
                        app.names{i} = app.names{i+1};
                        app.names{i+1} = temp3;
                        temp4 = app.teams{i};
                        app.teams{i} = app.teams{i+1};
                        app.teams{i+1} = temp4;
                        check = false;
                    end
                end
            end
            app.targetName = app.names(app.j); % target name is names of j (1-20)
            app.scoreEditField.Value = 0; % score = 0
            app.guessPlot() % run guess plot - tab 2
        end

        % Close request function: UIFigure
        function UIFigureCloseRequest(app, event)
            delete(app)
            
        end

        % Value changed function: XAXISDropDown
        function XAXISDropDownValueChanged(app, event)
            % when x axis is changed, run graph function depending on what
            % graph drop down is
            app.importantX = app.XAXISDropDown.Value;
            if app.GRAPHTYPEDropDown.Value == "Best Fit"
                plotData(app)
            elseif app.GRAPHTYPEDropDown.Value == "Gradient"
                gradientPlot(app)
            else 
                tilePlot(app)
            end
        end

        % Value changed function: YAXISDropDown
        function YAXISDropDownValueChanged(app, event)
            % when y axis is changed, run graph function depending on what
            % graph drop down is
            app.importantY = app.YAXISDropDown.Value;
            if app.GRAPHTYPEDropDown.Value == "Best Fit"
                plotData(app)
            elseif app.GRAPHTYPEDropDown.Value == "Gradient"
                gradientPlot(app)
            else 
                tilePlot(app)
            end
        end

        % Value changed function: playerEditField
        function playerEditFieldValueChanged(app, event)
            % updated target player each time player edit field is changed
            % - tab 1
            app.targetPlayer = app.playerEditField.Value;
        end

        % Button pushed function: RunDataButton
        function RunDataButtonPushed(app, event)
            playerPlot(app) % run player plot when user wants to run data
        end

        % Button pushed function: Cbutton
        function CbuttonButtonPushed(app, event)
            % allow user to input unique c
            app.playerEditField.Value = string(app.playerEditField.Value) + "ć";
        end

        % Value changed function: HintDropDown
        function HintDropDownValueChanged(app, event)
            % run guess plot when hint is changed - tab 2
            app.importantYtab2 = app.HintDropDown.Value;
            cla(app.hintAxes)
            app.guessPlot()
        end

        % Button pushed function: otherCbutton
        function otherCbuttonButtonPushed(app, event)
            % allow user to input unique c - other c 
            app.playerEditField.Value = string(app.playerEditField.Value) + "č";
        end

        % Button pushed function: GuessButton
        function GuessButtonPushed(app, event)
            % when user guesses - tab 2
            % if guess is same as target name
            if strcmpi(app.highlightedPlayerEditField.Value,app.targetName)
                if app.DOUBLEPOINTSLabel.Visible == "on" % check for double points
                    % if double on
                    % check to see if super easy mode on
                    if app.SuperEasyModeCheckBox.Value ==  true
                        % if check and super easy mode, plus 2 to score
                        app.scoreEditField.Value = app.scoreEditField.Value + 2;
                    % check to see is easy mode on
                    elseif app.EasyModeCheckBox.Value == true
                        % if check and easy mode, plus 4 to score
                        app.scoreEditField.Value = app.scoreEditField.Value + 4;
                    else % neither on
                        % else, plus six to score
                        app.scoreEditField.Value = app.scoreEditField.Value + 6;
                    end
                else % double points is off
                     if app.SuperEasyModeCheckBox.Value ==  true
                         % super easy mode on, plus 1 to score
                         app.scoreEditField.Value = app.scoreEditField.Value + 1;
                    elseif app.EasyModeCheckBox.Value == true
                         % easy mode on, plus 2 to score
                         app.scoreEditField.Value = app.scoreEditField.Value + 2;
                     else % neither on
                         % else, plus 3 to score
                         app.scoreEditField.Value = app.scoreEditField.Value + 3;
                     end
                end
                % display correct label and turn off wrong label
                app.CORRECTLabel.Visible = "on";
                app.WRONGLabel.Visible = "off";
            else % not the right guess
                % subtract one from score, display wrong label and turn off
                % correct label
                app.scoreEditField.Value = app.scoreEditField.Value - 1;
                app.WRONGLabel.Visible = "on";
                app.CORRECTLabel.Visible = "off";
            end
            app.j = randi(20); % reset random index
            app.importantYtab2 = "PTS"; % make the important Y tab pts
            app.importantXtab2 = "Age"; % x is always age
            % reset x y names and teams
            app.xtab2 = app.fullData{:,app.importantXtab2};
            app.ytab2 = app.fullData{:,app.importantYtab2};
            app.names = app.fullData{:,"Player"}; 
            app.teams = app.fullData{:,"Team"};
            % bubble sort again to find top 20 points per game players
            check = false;
            while check == false
                check = true;
                for i =1:app.nRows-1
                    if app.ytab2(i) < app.ytab2(i+1)
                        temp = app.ytab2(i);
                        app.ytab2(i) = app.ytab2(i+1);
                        app.ytab2(i+1) = temp;
                        temp2 = app.xtab2(i);
                        app.xtab2(i) = app.xtab2(i+1);
                        app.xtab2(i+1) = temp2;
                        temp3 = app.names{i};
                        app.names{i} = app.names{i+1};
                        app.names{i+1} = temp3;
                        temp4 = app.teams{i};
                        app.teams{i} = app.teams{i+1};
                        app.teams{i+1} = temp4;
                        check = false;
                    end
                end
            end
            if randi(50) > 46 % display double points six % of the time
                app.DOUBLEPOINTSLabel.Visible = "on";
            else
                app.DOUBLEPOINTSLabel.Visible = "off";
            end
            app.targetName = app.names(app.j); % new target name
            app.TeamImage.Visible = "off"; % turn off team image and silhouette
            app.SilhouetteImage.Visible = "off";
            app.EasyModeCheckBox.Value = false; % uncheck both check boxes
            app.SuperEasyModeCheckBox.Value = false;
            app.count = 0; % reset count
            app.guessPlot() % run function for new player graph
        end

        % Value changed function: EasyModeCheckBox
        function EasyModeCheckBoxValueChanged(app, event)
            % display team image when check is true
            if app.EasyModeCheckBox.Value == true
            app.TeamImage.Visible = "on";
            app.importantYtab2 = "PTS";
            app.importantXtab2 = "Age";
            app.xtab2 = app.fullData{:,app.importantXtab2};
            app.ytab2 = app.fullData{:,app.importantYtab2};
            app.names = app.fullData{:,"Player"};
            app.teams = app.fullData{:,"Team"};
            check = false;
            % bubble sort by pts, keep players team and x connected too
            while check == false
                check = true;
                for i =1:app.nRows-1
                    if app.ytab2(i) < app.ytab2(i+1)
                        temp = app.ytab2(i);
                        app.ytab2(i) = app.ytab2(i+1);
                        app.ytab2(i+1) = temp;
                        temp2 = app.xtab2(i);
                        app.xtab2(i) = app.xtab2(i+1);
                        app.xtab2(i+1) = temp2;
                        temp3 = app.names{i};
                        app.names{i} = app.names{i+1};
                        app.names{i+1} = temp3;
                        temp4 = app.teams{i};
                        app.teams{i} = app.teams{i+1};
                        app.teams{i+1} = temp4;
                        check = false;
                    end
                end
            end 


                for i = 1:20 % loop for possible player (only 20)
                    if strcmpi(string(app.targetName),string(app.names{i}))
                        targetTeam = app.teams{i}; % find target team when index of names = target name
                        break
                    end
                end
                for i = 1:15 % loop for number of teams (15)
                        if strcmpi(string(app.PicTeams(i)),string(targetTeam)) 
                            % when string of target team = index of
                            % PicTeams, target index = i
                            targetIndex = i;
                            break
                        end
                end
                % display team based on index of teamPics
                app.TeamImage.ImageSource = app.teamPics{targetIndex}; 
                app.TeamImage.ScaleMethod = "fit";
            else % if check, off - turn off image
                app.TeamImage.Visible = "off";
            end
            app.count = app.count + 1; % add one to count when checkbox changed
            if app.count > 6 % activate punishment function if count exceeds six
                app.punishment();
            end
        end

        % Button pushed function: otherCbutton_2
        function otherCbutton_2ButtonPushed(app, event)
            % allow unique c - tab 2
            app.highlightedPlayerEditField.Value = string(app.highlightedPlayerEditField.Value) + "č";
        end

        % Button pushed function: Cbutton_2
        function Cbutton_2ButtonPushed(app, event)
            % allow other unique c - tab 2
            app.highlightedPlayerEditField.Value = string(app.highlightedPlayerEditField.Value) + "ć";
        end

        % Value changed function: SuperEasyModeCheckBox
        function SuperEasyModeCheckBoxValueChanged(app, event)
            % if checkbox = true
            if app.SuperEasyModeCheckBox.Value == true
                app.SilhouetteImage.Visible = "on"; % turn on silhouette
                % image source of just index of silhouettes - they are
                % connected by order so this works
                app.SilhouetteImage.ImageSource = app.Silhouettes{app.j};
                app.SilhouetteImage.ScaleMethod = "fit";
            else % checkbox = false
                app.SilhouetteImage.Visible = "off"; % turn off silhouette
            end
            app.count = app.count + 1; % add 1 to count when checkbox changed
            if app.count > 6 % if count exceeds six, activate punishment function
                app.punishment();
            end
        end

        % Callback function: AboveAverageColorPicker
        function AboveAverageColorPickerValueChanged(app, event)
            % plot data function when colorpicker changed
            app.plotData();
        end

        % Callback function: BelowAverageColorPicker
        function BelowAverageColorPickerValueChanged(app, event)
            % plot data function when colorpicker changed
            app.plotData()
        end

        % Callback function: TargetPlayerColorPicker
        function TargetPlayerColorPickerValueChanged(app, event)
            % plot data function when colorpicker changed
            app.playerPlot()
        end

        % Value changed function: GradientDropDown
        function GradientDropDownValueChanged(app, event)

        end

        % Callback function
        function GradientCheckBoxValueChanged(app, event)

        end

        % Drop down opening function: GradientDropDown
        function GradientDropDownOpening(app, event)

        end

        % Value changed function: ColormapDropDown
        function ColormapDropDownValueChanged(app, event)
            % update graph when colormap changed
            if app.GRAPHTYPEDropDown.Value == "Gradient"
                % if graph drop down gradient, update gradient
                app.gradientPlot()
            else % else graph drop down is tile
                app.tilePlot() % update tile
            end
        end

        % Clicked callback: GradientDropDown
        function GradientDropDownClicked(app, event)
            % update gradient graph when gradient drop down is changed -
            % changes variable for gradient
            app.gradientPlot()
        end

        % Value changed function: SizeofPointsSlider
        function SizeofPointsSliderValueChanged(app, event)
            % update gradient when size of points slider is changed
            app.gradientPlot()
        end

        % Button pushed function: punishmentButton
        function punishmentButtonPushed(app, event)
            % update punishment count when button is pushed
            app.punishmentCount = app.punishmentCount + 1;
        end

        % Value changed function: GRAPHTYPEDropDown
        function GRAPHTYPEDropDownValueChanged(app, event)

            if app.GRAPHTYPEDropDown.Value == "Gradient"
                app.explanationLabel.Text = "The gradient graph plots your" + ...
                    " desired Y axis vs. your desired X axis,  Change the" + ...
                    " gradient drop down to see how different metrics affect" + ...
                    " the colormap. Change the colormap drop down to change " + ...
                    "the colors displayed on the graph. Change the size of" + ...
                    " points slider to affect the size of each data point." + ...
                    " Enter a player in the edit field and run data to highlight " + ...
                    "their point and see their appropriate percentiles. ";
                app.BelowAverageColorPicker.Visible = "off";
                app.AboveAverageColorPicker.Visible = "off";
                app.TargetPlayerColorPicker.Visible = "off";
                app.AboveAverageColorPickerLabel.Visible = "off";
                app.BelowAverageColorPickerLabel.Visible = "off";
                app.TargetPlayerColorPickerLabel.Visible = "off";
                app.GradientDropDown.Visible = "on";
                app.ColormapDropDown.Visible = "on";
                app.GradientDropDownLabel.Visible = "on";
                app.ColormapDropDownLabel.Visible = "on";
                app.SizeofPointsLabel.Visible = "on";
                app.SizeofPointsSlider.Visible = "on";
                app.ColormapDropDownLabel.Visible = "on";
                app.XBinsSlider.Visible = "off";
                app.XBinsSliderLabel.Visible = "off";
                app.YBinsSlider.Visible = "off";
                app.YBinsSliderLabel.Visible = "off";
                app.playerEditField.Visible = "on";
                app.WhatplayerdoyouwanttohighlightEditFieldLabel.Visible = "on";
                app.xPercentileLabel.Visible = "on";
                app.yPercentileLabel.Visible = "on";
                app.xGauge.Visible = "on";
                app.yGauge.Visible = "on";
                app.RunDataButton.Visible = "on";
                app.Cbutton.Visible = "on";
                app.otherCbutton.Visible = "on";
                app.gradientPlot()
            elseif app.GRAPHTYPEDropDown.Value == "Best Fit"
                app.explanationLabel.Text = "The line of best fit graph plots " + ...
                    "your selected Y axis vs your selected X axis alongside" + ...
                    " a line of best fit. Change any of the colorpickers to" + ...
                    " change the colors of their corresponding aspects on" + ...
                    " the graph. Enter a player in the edit field and run data to " + ...
                    "highlight their point in your desired color " + ...
                    "and see their appropriate percentiles.";
                app.BelowAverageColorPicker.Visible = "on";
                app.AboveAverageColorPicker.Visible = "on";
                app.TargetPlayerColorPicker.Visible = "on";
                app.AboveAverageColorPickerLabel.Visible = "on";
                app.BelowAverageColorPickerLabel.Visible = "on";
                app.TargetPlayerColorPickerLabel.Visible = "on";
                app.GradientDropDown.Visible = "off";
                app.ColormapDropDown.Visible = "off";
                app.GradientDropDownLabel.Visible = "off";
                app.ColormapDropDownLabel.Visible = "off";
                app.SizeofPointsLabel.Visible = "off";
                app.SizeofPointsSlider.Visible = "off";
                app.ColormapDropDownLabel.Visible = "off";
                app.XBinsSlider.Visible = "off";
                app.XBinsSliderLabel.Visible = "off";
                app.YBinsSlider.Visible = "off";
                app.YBinsSliderLabel.Visible = "off";
                app.playerEditField.Visible = "on";
                app.WhatplayerdoyouwanttohighlightEditFieldLabel.Visible = "on";
                app.xPercentileLabel.Visible = "on";
                app.yPercentileLabel.Visible = "on";
                app.xGauge.Visible = "on";
                app.yGauge.Visible = "on";
                app.RunDataButton.Visible = "on";
                app.Cbutton.Visible = "on";
                app.otherCbutton.Visible = "on";
                app.cb.Visible = "off";
                app.plotData()
            elseif app.GRAPHTYPEDropDown.Value == "2D Tile"
                app.explanationLabel.Text = "The 2D Tile plot graphs a number" + ...
                    " of bins. The corresponding color of the bins in comparison" + ...
                    " to the colorbar displays how many players lie in a certain bin. " + ...
                    "Change the selection of the colormap to alter the colors displayed in " + ...
                    "the tiles. Change the slider for x and y bins to create more or less bins" + ...
                    " the intended axis.";
                app.BelowAverageColorPicker.Visible = "off";
                app.AboveAverageColorPicker.Visible = "off";
                app.TargetPlayerColorPicker.Visible = "off";
                app.AboveAverageColorPickerLabel.Visible = "off";
                app.BelowAverageColorPickerLabel.Visible = "off";
                app.TargetPlayerColorPickerLabel.Visible = "off";
                app.GradientDropDown.Visible = "off";
                app.ColormapDropDown.Visible = "on";
                app.GradientDropDownLabel.Visible = "on";
                app.ColormapDropDownLabel.Visible = "on";
                app.SizeofPointsLabel.Visible = "off";
                app.SizeofPointsSlider.Visible = "off";
                app.cb.Visible = "on";
                app.XBinsSlider.Visible = "on";
                app.XBinsSliderLabel.Visible = "on";
                app.YBinsSlider.Visible = "on";
                app.YBinsSliderLabel.Visible = "on";
                app.playerEditField.Visible = "off";
                app.WhatplayerdoyouwanttohighlightEditFieldLabel.Visible = "off";
                app.xPercentileLabel.Visible = "off";
                app.yPercentileLabel.Visible = "off";
                app.xGauge.Visible = "off";
                app.yGauge.Visible = "off";
                app.RunDataButton.Visible = "off";
                app.Cbutton.Visible = "off";
                app.otherCbutton.Visible = "off";
                app.GradientDropDownLabel.Visible = "off";
                app.tilePlot()
            end
        end

        % Value changed function: XBinsSlider
        function XBinsSliderValueChanged(app, event)
            % update tile plot when slider for num of x bins is changed
            app.tilePlot()
        end

        % Value changed function: YBinsSlider
        function YBinsSliderValueChanged(app, event)
            % update tile plot when slider for num of y bins is changed
            app.tilePlot()
        end

        % Button pushed function: submit
        function submitButtonPushed(app, event)
           submitfunc(app) % run submit function when button is pushed
        end

        % Button pushed function: reset
        function resetButtonPushed(app, event)
            app.score.Value = 0; % reset score and correct counter, run player compare function
            app.correctCounter = 0;
            app.playerCompare()
        end

        % Button pushed function: newround
        function newroundButtonPushed(app, event)
            % run player compare function for new round
            app.playerCompare()
        end
    end

    % Component initialization
    methods (Access = private)

        % Create UIFigure and components
        function createComponents(app)

            % Get the file path for locating images
            pathToMLAPP = fileparts(mfilename('fullpath'));

            % Create UIFigure and hide until all components are created
            app.UIFigure = uifigure('Visible', 'off');
            app.UIFigure.Position = [100 100 1218 798];
            app.UIFigure.Name = 'MATLAB App';
            app.UIFigure.CloseRequestFcn = createCallbackFcn(app, @UIFigureCloseRequest, true);

            % Create TabGroup
            app.TabGroup = uitabgroup(app.UIFigure);
            app.TabGroup.Position = [1 3 1216 796];

            % Create IntroductionTab
            app.IntroductionTab = uitab(app.TabGroup);
            app.IntroductionTab.Title = 'Introduction';

            % Create NBA2324APPLabel
            app.NBA2324APPLabel = uilabel(app.IntroductionTab);
            app.NBA2324APPLabel.FontSize = 60;
            app.NBA2324APPLabel.Position = [374 601 460 79];
            app.NBA2324APPLabel.Text = 'NBA ''23-''24 APP';

            % Create Label3_4
            app.Label3_4 = uilabel(app.IntroductionTab);
            app.Label3_4.WordWrap = 'on';
            app.Label3_4.FontSize = 22;
            app.Label3_4.Position = [128 64 952 581];
            app.Label3_4.Text = {'---------------------------------------------------------------------------------------------------------------------------------This app provides a comprehensive experience for analyzing the 2023-2024 NBA season based on per-game statistics for the top 500 players.                                                                                       -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-                                                                         '; 'Tab 2 - Player Graphs: analytical graphs including a gradient plot, line of best fit graph, and a 2D tile plot.                                                                                                                                                   -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-                                                                                                                                          Tab 3 & 4 - Player Guess & Player Comparison: games designed to challenge NBA knowledge and provide user with enjoyable experience.                                                                                      -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-           Tab 5 - Key: full guide to valuable notations needed to utilize the app to its fullest potential.            -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.- Note: Matlab Statistics and Machine Learning Toolbox must be downloaded for the app to run properly.                                                                                                                                             -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-Data: Received from: https://www.basketball-reference.com/leagues/NBA_2024_per_game.html                                                                                 -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-Creators: Oliver Hamilton and Thomas Block                                                                                    ---------------------------------------------------------------------------------------------------------------------------------'};

            % Create Image3
            app.Image3 = uiimage(app.IntroductionTab);
            app.Image3.Position = [992 623 171 139];
            app.Image3.ImageSource = fullfile(pathToMLAPP, 'LOGO.jpg');

            % Create Image4
            app.Image4 = uiimage(app.IntroductionTab);
            app.Image4.Position = [39 602 220 167];
            app.Image4.ImageSource = fullfile(pathToMLAPP, 'TEAMS.jpg');

            % Create PlayerGraphsTab
            app.PlayerGraphsTab = uitab(app.TabGroup);
            app.PlayerGraphsTab.Title = 'Player Graphs';

            % Create efficiencyAxes
            app.efficiencyAxes = uiaxes(app.PlayerGraphsTab);
            title(app.efficiencyAxes, 'Title')
            xlabel(app.efficiencyAxes, 'X')
            ylabel(app.efficiencyAxes, 'Y')
            zlabel(app.efficiencyAxes, 'Z')
            app.efficiencyAxes.Position = [317 139 844 543];

            % Create xGauge
            app.xGauge = uigauge(app.PlayerGraphsTab, 'linear');
            app.xGauge.BackgroundColor = [0.8 0.8 0.8];
            app.xGauge.Position = [735 77 445 41];

            % Create yGauge
            app.yGauge = uigauge(app.PlayerGraphsTab, 'linear');
            app.yGauge.BackgroundColor = [0.8 0.8 0.8];
            app.yGauge.Position = [735 17 446 41];

            % Create YAXISDropDownLabel
            app.YAXISDropDownLabel = uilabel(app.PlayerGraphsTab);
            app.YAXISDropDownLabel.HorizontalAlignment = 'right';
            app.YAXISDropDownLabel.Position = [20 585 44 22];
            app.YAXISDropDownLabel.Text = 'Y-AXIS';

            % Create YAXISDropDown
            app.YAXISDropDown = uidropdown(app.PlayerGraphsTab);
            app.YAXISDropDown.Items = {'PTS', 'FG_', 'x3P_', 'x2P_', 'FT_', 'AST', 'STL', 'BLK', 'TOV', 'OFFENSE', 'DEFENSE'};
            app.YAXISDropDown.ValueChangedFcn = createCallbackFcn(app, @YAXISDropDownValueChanged, true);
            app.YAXISDropDown.Position = [74 585 175 22];
            app.YAXISDropDown.Value = 'PTS';

            % Create XAXISDropDownLabel
            app.XAXISDropDownLabel = uilabel(app.PlayerGraphsTab);
            app.XAXISDropDownLabel.HorizontalAlignment = 'right';
            app.XAXISDropDownLabel.Position = [16 628 44 22];
            app.XAXISDropDownLabel.Text = 'X-AXIS';

            % Create XAXISDropDown
            app.XAXISDropDown = uidropdown(app.PlayerGraphsTab);
            app.XAXISDropDown.Items = {'Age', 'PF', 'G', 'GS'};
            app.XAXISDropDown.ValueChangedFcn = createCallbackFcn(app, @XAXISDropDownValueChanged, true);
            app.XAXISDropDown.Position = [70 628 180 22];
            app.XAXISDropDown.Value = 'Age';

            % Create WhatplayerdoyouwanttohighlightEditFieldLabel
            app.WhatplayerdoyouwanttohighlightEditFieldLabel = uilabel(app.PlayerGraphsTab);
            app.WhatplayerdoyouwanttohighlightEditFieldLabel.HorizontalAlignment = 'right';
            app.WhatplayerdoyouwanttohighlightEditFieldLabel.FontSize = 15;
            app.WhatplayerdoyouwanttohighlightEditFieldLabel.Position = [20 36 258 22];
            app.WhatplayerdoyouwanttohighlightEditFieldLabel.Text = 'What player do you want to highlight?';

            % Create playerEditField
            app.playerEditField = uieditfield(app.PlayerGraphsTab, 'text');
            app.playerEditField.ValueChangedFcn = createCallbackFcn(app, @playerEditFieldValueChanged, true);
            app.playerEditField.Position = [292 36 153 22];

            % Create xPercentileLabel
            app.xPercentileLabel = uilabel(app.PlayerGraphsTab);
            app.xPercentileLabel.Position = [628 75 109 33];

            % Create yPercentileLabel
            app.yPercentileLabel = uilabel(app.PlayerGraphsTab);
            app.yPercentileLabel.Position = [628 26 101 22];
            app.yPercentileLabel.Text = 'Label2';

            % Create RunDataButton
            app.RunDataButton = uibutton(app.PlayerGraphsTab, 'push');
            app.RunDataButton.ButtonPushedFcn = createCallbackFcn(app, @RunDataButtonPushed, true);
            app.RunDataButton.Position = [460 37 82 21];
            app.RunDataButton.Text = 'Run Data';

            % Create otherCbutton
            app.otherCbutton = uibutton(app.PlayerGraphsTab, 'push');
            app.otherCbutton.ButtonPushedFcn = createCallbackFcn(app, @otherCbuttonButtonPushed, true);
            app.otherCbutton.FontSize = 15;
            app.otherCbutton.FontWeight = 'bold';
            app.otherCbutton.Position = [328 74 28 26];
            app.otherCbutton.Text = 'č';

            % Create Cbutton
            app.Cbutton = uibutton(app.PlayerGraphsTab, 'push');
            app.Cbutton.ButtonPushedFcn = createCallbackFcn(app, @CbuttonButtonPushed, true);
            app.Cbutton.FontSize = 15;
            app.Cbutton.FontWeight = 'bold';
            app.Cbutton.Position = [380 74 28 26];
            app.Cbutton.Text = 'ć';

            % Create AboveAverageColorPickerLabel
            app.AboveAverageColorPickerLabel = uilabel(app.PlayerGraphsTab);
            app.AboveAverageColorPickerLabel.HorizontalAlignment = 'right';
            app.AboveAverageColorPickerLabel.Visible = 'off';
            app.AboveAverageColorPickerLabel.Position = [32 386 86 22];
            app.AboveAverageColorPickerLabel.Text = 'Above Average';

            % Create AboveAverageColorPicker
            app.AboveAverageColorPicker = uicolorpicker(app.PlayerGraphsTab);
            app.AboveAverageColorPicker.Value = [0.0745098039215686 0.623529411764706 1];
            app.AboveAverageColorPicker.ValueChangedFcn = createCallbackFcn(app, @AboveAverageColorPickerValueChanged, true);
            app.AboveAverageColorPicker.Visible = 'off';
            app.AboveAverageColorPicker.Position = [133 386 128 22];

            % Create BelowAverageColorPickerLabel
            app.BelowAverageColorPickerLabel = uilabel(app.PlayerGraphsTab);
            app.BelowAverageColorPickerLabel.HorizontalAlignment = 'right';
            app.BelowAverageColorPickerLabel.Visible = 'off';
            app.BelowAverageColorPickerLabel.Position = [30 351 85 22];
            app.BelowAverageColorPickerLabel.Text = 'Below Average';

            % Create BelowAverageColorPicker
            app.BelowAverageColorPicker = uicolorpicker(app.PlayerGraphsTab);
            app.BelowAverageColorPicker.Value = [0.392156862745098 0.831372549019608 0.0745098039215686];
            app.BelowAverageColorPicker.ValueChangedFcn = createCallbackFcn(app, @BelowAverageColorPickerValueChanged, true);
            app.BelowAverageColorPicker.Visible = 'off';
            app.BelowAverageColorPicker.Position = [133 351 128 22];

            % Create TargetPlayerColorPickerLabel
            app.TargetPlayerColorPickerLabel = uilabel(app.PlayerGraphsTab);
            app.TargetPlayerColorPickerLabel.HorizontalAlignment = 'right';
            app.TargetPlayerColorPickerLabel.Visible = 'off';
            app.TargetPlayerColorPickerLabel.Position = [40 317 76 22];
            app.TargetPlayerColorPickerLabel.Text = 'Target Player';

            % Create TargetPlayerColorPicker
            app.TargetPlayerColorPicker = uicolorpicker(app.PlayerGraphsTab);
            app.TargetPlayerColorPicker.Value = [1 0.0745098039215686 0.650980392156863];
            app.TargetPlayerColorPicker.ValueChangedFcn = createCallbackFcn(app, @TargetPlayerColorPickerValueChanged, true);
            app.TargetPlayerColorPicker.Visible = 'off';
            app.TargetPlayerColorPicker.Position = [133 317 127 22];

            % Create GradientDropDownLabel
            app.GradientDropDownLabel = uilabel(app.PlayerGraphsTab);
            app.GradientDropDownLabel.HorizontalAlignment = 'right';
            app.GradientDropDownLabel.Position = [16 499 51 22];
            app.GradientDropDownLabel.Text = 'Gradient';

            % Create GradientDropDown
            app.GradientDropDown = uidropdown(app.PlayerGraphsTab);
            app.GradientDropDown.Items = {'TRB', 'MP', 'x3P', 'x2P', 'FT'};
            app.GradientDropDown.DropDownOpeningFcn = createCallbackFcn(app, @GradientDropDownOpening, true);
            app.GradientDropDown.ValueChangedFcn = createCallbackFcn(app, @GradientDropDownValueChanged, true);
            app.GradientDropDown.ClickedFcn = createCallbackFcn(app, @GradientDropDownClicked, true);
            app.GradientDropDown.Position = [82 499 166 22];
            app.GradientDropDown.Value = 'TRB';

            % Create ColormapDropDownLabel
            app.ColormapDropDownLabel = uilabel(app.PlayerGraphsTab);
            app.ColormapDropDownLabel.HorizontalAlignment = 'right';
            app.ColormapDropDownLabel.Position = [13 539 57 22];
            app.ColormapDropDownLabel.Text = 'Colormap';

            % Create ColormapDropDown
            app.ColormapDropDown = uidropdown(app.PlayerGraphsTab);
            app.ColormapDropDown.Items = {'parula', 'turbo', 'hsv', 'hot', 'cool', 'summer', 'autumn', 'winter', 'spring', 'jet'};
            app.ColormapDropDown.ValueChangedFcn = createCallbackFcn(app, @ColormapDropDownValueChanged, true);
            app.ColormapDropDown.Position = [85 539 162 22];
            app.ColormapDropDown.Value = 'parula';

            % Create SizeofPointsSlider
            app.SizeofPointsSlider = uislider(app.PlayerGraphsTab);
            app.SizeofPointsSlider.Limits = [15 40];
            app.SizeofPointsSlider.ValueChangedFcn = createCallbackFcn(app, @SizeofPointsSliderValueChanged, true);
            app.SizeofPointsSlider.Position = [27 448 220 3];
            app.SizeofPointsSlider.Value = 27.5;

            % Create SizeofPointsLabel
            app.SizeofPointsLabel = uilabel(app.PlayerGraphsTab);
            app.SizeofPointsLabel.Position = [104 470 78 23];
            app.SizeofPointsLabel.Text = 'Size of Points';

            % Create GRAPHTYPEDropDownLabel
            app.GRAPHTYPEDropDownLabel = uilabel(app.PlayerGraphsTab);
            app.GRAPHTYPEDropDownLabel.HorizontalAlignment = 'right';
            app.GRAPHTYPEDropDownLabel.Position = [17 725 83 22];
            app.GRAPHTYPEDropDownLabel.Text = 'GRAPH TYPE';

            % Create GRAPHTYPEDropDown
            app.GRAPHTYPEDropDown = uidropdown(app.PlayerGraphsTab);
            app.GRAPHTYPEDropDown.Items = {'Gradient', 'Best Fit', '2D Tile'};
            app.GRAPHTYPEDropDown.ValueChangedFcn = createCallbackFcn(app, @GRAPHTYPEDropDownValueChanged, true);
            app.GRAPHTYPEDropDown.Position = [107 725 148 22];
            app.GRAPHTYPEDropDown.Value = 'Gradient';

            % Create XBinsSliderLabel
            app.XBinsSliderLabel = uilabel(app.PlayerGraphsTab);
            app.XBinsSliderLabel.HorizontalAlignment = 'right';
            app.XBinsSliderLabel.Visible = 'off';
            app.XBinsSliderLabel.Position = [67 106 40 22];
            app.XBinsSliderLabel.Text = 'X-Bins';

            % Create XBinsSlider
            app.XBinsSlider = uislider(app.PlayerGraphsTab);
            app.XBinsSlider.Limits = [10 50];
            app.XBinsSlider.Orientation = 'vertical';
            app.XBinsSlider.ValueChangedFcn = createCallbackFcn(app, @XBinsSliderValueChanged, true);
            app.XBinsSlider.Visible = 'off';
            app.XBinsSlider.Position = [82 136 10 150];
            app.XBinsSlider.Value = 10;

            % Create YBinsSliderLabel
            app.YBinsSliderLabel = uilabel(app.PlayerGraphsTab);
            app.YBinsSliderLabel.HorizontalAlignment = 'right';
            app.YBinsSliderLabel.Visible = 'off';
            app.YBinsSliderLabel.Position = [175 107 39 22];
            app.YBinsSliderLabel.Text = 'Y-Bins';

            % Create YBinsSlider
            app.YBinsSlider = uislider(app.PlayerGraphsTab);
            app.YBinsSlider.Limits = [10 50];
            app.YBinsSlider.Orientation = 'vertical';
            app.YBinsSlider.ValueChangedFcn = createCallbackFcn(app, @YBinsSliderValueChanged, true);
            app.YBinsSlider.Visible = 'off';
            app.YBinsSlider.Position = [180 137 10 150];
            app.YBinsSlider.Value = 10;

            % Create explanationLabel
            app.explanationLabel = uilabel(app.PlayerGraphsTab);
            app.explanationLabel.WordWrap = 'on';
            app.explanationLabel.FontSize = 15;
            app.explanationLabel.Position = [313 680 884 92];
            app.explanationLabel.Text = 'The gradient graph plots your desired Y axis vs. your desired X axis,  Change the gradient drop down to see how different metrics affect the colormap. Change the colormap drop down to change the colors displayed on the graph. Change the size of points slider to affect the size of each data point. Enter a player in the edit field and run data to highlight their point and see their appropriate percentiles. ';

            % Create PlayerGuessTab
            app.PlayerGuessTab = uitab(app.TabGroup);
            app.PlayerGuessTab.Title = 'Player Guess';

            % Create hintAxes
            app.hintAxes = uiaxes(app.PlayerGuessTab);
            title(app.hintAxes, 'Title')
            xlabel(app.hintAxes, 'X')
            ylabel(app.hintAxes, 'Y')
            zlabel(app.hintAxes, 'Z')
            app.hintAxes.Position = [430 337 750 408];

            % Create EasyModeCheckBox
            app.EasyModeCheckBox = uicheckbox(app.PlayerGuessTab);
            app.EasyModeCheckBox.ValueChangedFcn = createCallbackFcn(app, @EasyModeCheckBoxValueChanged, true);
            app.EasyModeCheckBox.Text = 'Easy Mode?';
            app.EasyModeCheckBox.Position = [222 440 110 17];

            % Create WhoisthehighlightedplayerEditFieldLabel
            app.WhoisthehighlightedplayerEditFieldLabel = uilabel(app.PlayerGuessTab);
            app.WhoisthehighlightedplayerEditFieldLabel.HorizontalAlignment = 'right';
            app.WhoisthehighlightedplayerEditFieldLabel.FontWeight = 'bold';
            app.WhoisthehighlightedplayerEditFieldLabel.Position = [32 478 172 22];
            app.WhoisthehighlightedplayerEditFieldLabel.Text = 'Who is the highlighted player';

            % Create highlightedPlayerEditField
            app.highlightedPlayerEditField = uieditfield(app.PlayerGuessTab, 'text');
            app.highlightedPlayerEditField.Position = [219 478 126 22];

            % Create SCOREEditFieldLabel
            app.SCOREEditFieldLabel = uilabel(app.PlayerGuessTab);
            app.SCOREEditFieldLabel.HorizontalAlignment = 'right';
            app.SCOREEditFieldLabel.Position = [20 550 48 22];
            app.SCOREEditFieldLabel.Text = 'SCORE';

            % Create scoreEditField
            app.scoreEditField = uieditfield(app.PlayerGuessTab, 'numeric');
            app.scoreEditField.Editable = 'off';
            app.scoreEditField.Position = [83 550 100 22];

            % Create DOUBLEPOINTSLabel
            app.DOUBLEPOINTSLabel = uilabel(app.PlayerGuessTab);
            app.DOUBLEPOINTSLabel.BackgroundColor = [0.3922 0.8314 0.0745];
            app.DOUBLEPOINTSLabel.FontWeight = 'bold';
            app.DOUBLEPOINTSLabel.Visible = 'off';
            app.DOUBLEPOINTSLabel.Position = [57 518 119 22];
            app.DOUBLEPOINTSLabel.Text = ' DOUBLE POINTS!!!';

            % Create CORRECTLabel
            app.CORRECTLabel = uilabel(app.PlayerGuessTab);
            app.CORRECTLabel.BackgroundColor = [0.5333 0.9216 0.2588];
            app.CORRECTLabel.HorizontalAlignment = 'center';
            app.CORRECTLabel.Visible = 'off';
            app.CORRECTLabel.Position = [79 380 100 22];
            app.CORRECTLabel.Text = 'CORRECT';

            % Create WRONGLabel
            app.WRONGLabel = uilabel(app.PlayerGuessTab);
            app.WRONGLabel.BackgroundColor = [0.9216 0.3569 0.3569];
            app.WRONGLabel.HorizontalAlignment = 'center';
            app.WRONGLabel.Visible = 'off';
            app.WRONGLabel.Position = [219 381 99 19];
            app.WRONGLabel.Text = 'WRONG';

            % Create HintDropDownLabel
            app.HintDropDownLabel = uilabel(app.PlayerGuessTab);
            app.HintDropDownLabel.HorizontalAlignment = 'right';
            app.HintDropDownLabel.Position = [209 550 26 22];
            app.HintDropDownLabel.Text = 'Hint';

            % Create HintDropDown
            app.HintDropDown = uidropdown(app.PlayerGuessTab);
            app.HintDropDown.Items = {'PTS', 'AST', 'STL', 'BLK'};
            app.HintDropDown.ValueChangedFcn = createCallbackFcn(app, @HintDropDownValueChanged, true);
            app.HintDropDown.Position = [250 550 100 22];
            app.HintDropDown.Value = 'PTS';

            % Create GuessButton
            app.GuessButton = uibutton(app.PlayerGuessTab, 'push');
            app.GuessButton.ButtonPushedFcn = createCallbackFcn(app, @GuessButtonPushed, true);
            app.GuessButton.Position = [77 420 100 22];
            app.GuessButton.Text = 'Guess';

            % Create TeamImage
            app.TeamImage = uiimage(app.PlayerGuessTab);
            app.TeamImage.Visible = 'off';
            app.TeamImage.Position = [104 35 388 284];

            % Create SilhouetteImage
            app.SilhouetteImage = uiimage(app.PlayerGuessTab);
            app.SilhouetteImage.Visible = 'off';
            app.SilhouetteImage.Position = [629 35 486 284];

            % Create otherCbutton_2
            app.otherCbutton_2 = uibutton(app.PlayerGuessTab, 'push');
            app.otherCbutton_2.ButtonPushedFcn = createCallbackFcn(app, @otherCbutton_2ButtonPushed, true);
            app.otherCbutton_2.FontSize = 15;
            app.otherCbutton_2.FontWeight = 'bold';
            app.otherCbutton_2.Position = [232 508 28 26];
            app.otherCbutton_2.Text = 'č';

            % Create Cbutton_2
            app.Cbutton_2 = uibutton(app.PlayerGuessTab, 'push');
            app.Cbutton_2.ButtonPushedFcn = createCallbackFcn(app, @Cbutton_2ButtonPushed, true);
            app.Cbutton_2.FontSize = 15;
            app.Cbutton_2.FontWeight = 'bold';
            app.Cbutton_2.Position = [295 508 28 26];
            app.Cbutton_2.Text = 'ć';

            % Create SuperEasyModeCheckBox
            app.SuperEasyModeCheckBox = uicheckbox(app.PlayerGuessTab);
            app.SuperEasyModeCheckBox.ValueChangedFcn = createCallbackFcn(app, @SuperEasyModeCheckBoxValueChanged, true);
            app.SuperEasyModeCheckBox.Text = 'Super Easy Mode?';
            app.SuperEasyModeCheckBox.Position = [222 407 124 32];

            % Create punishmentButton
            app.punishmentButton = uibutton(app.PlayerGuessTab, 'push');
            app.punishmentButton.ButtonPushedFcn = createCallbackFcn(app, @punishmentButtonPushed, true);
            app.punishmentButton.Visible = 'off';
            app.punishmentButton.Position = [80 420 100 22];
            app.punishmentButton.Text = 'PUNISHMENT';

            % Create punishmentLabel
            app.punishmentLabel = uilabel(app.PlayerGuessTab);
            app.punishmentLabel.BackgroundColor = [0.902 0.902 0.902];
            app.punishmentLabel.FontWeight = 'bold';
            app.punishmentLabel.FontColor = [0.149 0.149 0.149];
            app.punishmentLabel.Visible = 'off';
            app.punishmentLabel.Position = [19 348 408 22];
            app.punishmentLabel.Text = 'Cheater! Press the punishment button 25 times to return to the game.';

            % Create Label3_2
            app.Label3_2 = uilabel(app.PlayerGuessTab);
            app.Label3_2.WordWrap = 'on';
            app.Label3_2.FontSize = 15;
            app.Label3_2.Position = [20 588 406 184];
            app.Label3_2.Text = 'RULES: Guess the highlighted player based on the graph. Change the hint drop down to receive diffeerent hints for your player. Feel free to look at easy mode (team) and super easy mode (picture of player) - though turning them on and off too much will result in punishment. Scoring is as follows:        1 point with super easy mode on                                                                       2 point with easy mode on                                                                                        3 points with neither on                                                                                          - 1 points for incorrect answer ';

            % Create PlayerComparisonTab
            app.PlayerComparisonTab = uitab(app.TabGroup);
            app.PlayerComparisonTab.Title = ' Player Comparison';

            % Create newround
            app.newround = uibutton(app.PlayerComparisonTab, 'push');
            app.newround.ButtonPushedFcn = createCallbackFcn(app, @newroundButtonPushed, true);
            app.newround.FontSize = 35;
            app.newround.Position = [444 648 318 112];
            app.newround.Text = 'New Round';

            % Create reset
            app.reset = uibutton(app.PlayerComparisonTab, 'push');
            app.reset.ButtonPushedFcn = createCallbackFcn(app, @resetButtonPushed, true);
            app.reset.FontSize = 30;
            app.reset.Position = [469 559 275 88];
            app.reset.Text = 'Reset Score';

            % Create player1
            app.player1 = uilabel(app.PlayerComparisonTab);
            app.player1.FontSize = 25;
            app.player1.Position = [82 578 277 75];
            app.player1.Text = 'Player1';

            % Create Image
            app.Image = uiimage(app.PlayerComparisonTab);
            app.Image.Position = [57 281 345 310];

            % Create player2
            app.player2 = uilabel(app.PlayerComparisonTab);
            app.player2.FontSize = 25;
            app.player2.Position = [852 570 277 75];
            app.player2.Text = 'Player2';

            % Create Image2
            app.Image2 = uiimage(app.PlayerComparisonTab);
            app.Image2.Position = [826 276 337 310];

            % Create DoesLabel
            app.DoesLabel = uilabel(app.PlayerComparisonTab);
            app.DoesLabel.FontSize = 20;
            app.DoesLabel.Position = [491 500 140 42];
            app.DoesLabel.Text = 'Does ';

            % Create player1compare
            app.player1compare = uilabel(app.PlayerComparisonTab);
            app.player1compare.FontSize = 20;
            app.player1compare.Position = [559 505 240 32];
            app.player1compare.Text = 'Player 1';

            % Create havemoreLabel
            app.havemoreLabel = uilabel(app.PlayerComparisonTab);
            app.havemoreLabel.FontSize = 20;
            app.havemoreLabel.Position = [522 467 187 35];
            app.havemoreLabel.Text = 'have more...';

            % Create apg
            app.apg = uicheckbox(app.PlayerComparisonTab);
            app.apg.Text = 'APG';
            app.apg.FontSize = 25;
            app.apg.Position = [559 425 220 43];

            % Create bpg
            app.bpg = uicheckbox(app.PlayerComparisonTab);
            app.bpg.Text = 'BPG';
            app.bpg.FontSize = 25;
            app.bpg.Position = [559 277 215 43];

            % Create ppg
            app.ppg = uicheckbox(app.PlayerComparisonTab);
            app.ppg.Text = 'PPG';
            app.ppg.FontSize = 25;
            app.ppg.Position = [559 380 213 43];

            % Create fouls
            app.fouls = uicheckbox(app.PlayerComparisonTab);
            app.fouls.Text = 'Fouls';
            app.fouls.FontSize = 25;
            app.fouls.Position = [559 235 202 43];

            % Create spg
            app.spg = uicheckbox(app.PlayerComparisonTab);
            app.spg.Text = 'SPG';
            app.spg.FontSize = 25;
            app.spg.Position = [559 328 211 43];

            % Create submit
            app.submit = uibutton(app.PlayerComparisonTab, 'push');
            app.submit.ButtonPushedFcn = createCallbackFcn(app, @submitButtonPushed, true);
            app.submit.FontSize = 35;
            app.submit.Position = [415 74 382 98];
            app.submit.Text = 'Submit';

            % Create ScoreEditFieldLabel
            app.ScoreEditFieldLabel = uilabel(app.PlayerComparisonTab);
            app.ScoreEditFieldLabel.HorizontalAlignment = 'right';
            app.ScoreEditFieldLabel.FontSize = 25;
            app.ScoreEditFieldLabel.Position = [449 14 70 32];
            app.ScoreEditFieldLabel.Text = 'Score';

            % Create score
            app.score = uieditfield(app.PlayerComparisonTab, 'numeric');
            app.score.Editable = 'off';
            app.score.FontSize = 25;
            app.score.Position = [534 5 197 60];

            % Create player1label
            app.player1label = uilabel(app.PlayerComparisonTab);
            app.player1label.FontSize = 20;
            app.player1label.Position = [84 234 162 62];
            app.player1label.Text = 'Player 1 Stats';

            % Create PPGEditFieldLabel
            app.PPGEditFieldLabel = uilabel(app.PlayerComparisonTab);
            app.PPGEditFieldLabel.HorizontalAlignment = 'right';
            app.PPGEditFieldLabel.FontSize = 20;
            app.PPGEditFieldLabel.Position = [91 163 47 26];
            app.PPGEditFieldLabel.Text = 'PPG';

            % Create ppg1
            app.ppg1 = uieditfield(app.PlayerComparisonTab, 'text');
            app.ppg1.Editable = 'off';
            app.ppg1.Position = [153 153 118 50];

            % Create BPGEditFieldLabel
            app.BPGEditFieldLabel = uilabel(app.PlayerComparisonTab);
            app.BPGEditFieldLabel.HorizontalAlignment = 'right';
            app.BPGEditFieldLabel.FontSize = 20;
            app.BPGEditFieldLabel.Position = [91 66 47 26];
            app.BPGEditFieldLabel.Text = 'BPG';

            % Create bpg1
            app.bpg1 = uieditfield(app.PlayerComparisonTab, 'text');
            app.bpg1.Editable = 'off';
            app.bpg1.Position = [153 56 118 50];

            % Create SPGEditFieldLabel
            app.SPGEditFieldLabel = uilabel(app.PlayerComparisonTab);
            app.SPGEditFieldLabel.HorizontalAlignment = 'right';
            app.SPGEditFieldLabel.FontSize = 20;
            app.SPGEditFieldLabel.Position = [91 115 47 26];
            app.SPGEditFieldLabel.Text = 'SPG';

            % Create spg1
            app.spg1 = uieditfield(app.PlayerComparisonTab, 'text');
            app.spg1.Editable = 'off';
            app.spg1.Position = [153 105 118 50];

            % Create APGEditField_4Label
            app.APGEditField_4Label = uilabel(app.PlayerComparisonTab);
            app.APGEditField_4Label.HorizontalAlignment = 'right';
            app.APGEditField_4Label.FontSize = 20;
            app.APGEditField_4Label.Position = [91 211 47 26];
            app.APGEditField_4Label.Text = 'APG';

            % Create apg1
            app.apg1 = uieditfield(app.PlayerComparisonTab, 'text');
            app.apg1.Editable = 'off';
            app.apg1.Position = [153 201 118 50];

            % Create FoulsEditFieldLabel
            app.FoulsEditFieldLabel = uilabel(app.PlayerComparisonTab);
            app.FoulsEditFieldLabel.HorizontalAlignment = 'right';
            app.FoulsEditFieldLabel.FontSize = 20;
            app.FoulsEditFieldLabel.Position = [84 16 54 26];
            app.FoulsEditFieldLabel.Text = 'Fouls';

            % Create fouls1
            app.fouls1 = uieditfield(app.PlayerComparisonTab, 'text');
            app.fouls1.Editable = 'off';
            app.fouls1.Position = [153 6 118 50];

            % Create PPGEditField_2Label
            app.PPGEditField_2Label = uilabel(app.PlayerComparisonTab);
            app.PPGEditField_2Label.HorizontalAlignment = 'right';
            app.PPGEditField_2Label.FontSize = 20;
            app.PPGEditField_2Label.Position = [882 163 47 26];
            app.PPGEditField_2Label.Text = 'PPG';

            % Create ppg2
            app.ppg2 = uieditfield(app.PlayerComparisonTab, 'text');
            app.ppg2.Editable = 'off';
            app.ppg2.Position = [944 153 118 50];

            % Create BPGEditField_2Label
            app.BPGEditField_2Label = uilabel(app.PlayerComparisonTab);
            app.BPGEditField_2Label.HorizontalAlignment = 'right';
            app.BPGEditField_2Label.FontSize = 20;
            app.BPGEditField_2Label.Position = [882 65 47 26];
            app.BPGEditField_2Label.Text = 'BPG';

            % Create bpg2
            app.bpg2 = uieditfield(app.PlayerComparisonTab, 'text');
            app.bpg2.Editable = 'off';
            app.bpg2.Position = [944 55 118 50];

            % Create SPGEditField_2Label
            app.SPGEditField_2Label = uilabel(app.PlayerComparisonTab);
            app.SPGEditField_2Label.HorizontalAlignment = 'right';
            app.SPGEditField_2Label.FontSize = 20;
            app.SPGEditField_2Label.Position = [882 113 47 26];
            app.SPGEditField_2Label.Text = 'SPG';

            % Create spg2
            app.spg2 = uieditfield(app.PlayerComparisonTab, 'text');
            app.spg2.Editable = 'off';
            app.spg2.Position = [944 103 118 50];

            % Create APGEditField_5Label
            app.APGEditField_5Label = uilabel(app.PlayerComparisonTab);
            app.APGEditField_5Label.HorizontalAlignment = 'right';
            app.APGEditField_5Label.FontSize = 20;
            app.APGEditField_5Label.Position = [882 211 47 26];
            app.APGEditField_5Label.Text = 'APG';

            % Create apg2
            app.apg2 = uieditfield(app.PlayerComparisonTab, 'text');
            app.apg2.Editable = 'off';
            app.apg2.Position = [944 201 118 50];

            % Create FoulsEditField_2Label
            app.FoulsEditField_2Label = uilabel(app.PlayerComparisonTab);
            app.FoulsEditField_2Label.HorizontalAlignment = 'right';
            app.FoulsEditField_2Label.FontSize = 20;
            app.FoulsEditField_2Label.Position = [875 16 54 26];
            app.FoulsEditField_2Label.Text = 'Fouls';

            % Create fouls2
            app.fouls2 = uieditfield(app.PlayerComparisonTab, 'text');
            app.fouls2.Editable = 'off';
            app.fouls2.Position = [944 6 118 50];

            % Create player2label
            app.player2label = uilabel(app.PlayerComparisonTab);
            app.player2label.FontSize = 20;
            app.player2label.Position = [862 234 162 62];
            app.player2label.Text = 'Player 2 Stats';

            % Create doublepoints
            app.doublepoints = uilabel(app.PlayerComparisonTab);
            app.doublepoints.BackgroundColor = [1 0 0];
            app.doublepoints.FontSize = 35;
            app.doublepoints.FontColor = [0.149 0.149 0.149];
            app.doublepoints.Position = [837 637 325 108];
            app.doublepoints.Text = 'DOUBLE POINTS';

            % Create thanLabel
            app.thanLabel = uilabel(app.PlayerComparisonTab);
            app.thanLabel.FontSize = 20;
            app.thanLabel.Position = [507 192 163 43];
            app.thanLabel.Text = 'than';

            % Create player2compare
            app.player2compare = uilabel(app.PlayerComparisonTab);
            app.player2compare.FontSize = 20;
            app.player2compare.Position = [570 198 257 32];
            app.player2compare.Text = 'Player 2';

            % Create TEAM2EditFieldLabel
            app.TEAM2EditFieldLabel = uilabel(app.PlayerComparisonTab);
            app.TEAM2EditFieldLabel.HorizontalAlignment = 'right';
            app.TEAM2EditFieldLabel.Position = [1017 253 48 22];
            app.TEAM2EditFieldLabel.Text = 'TEAM 2';

            % Create TEAM2EditField
            app.TEAM2EditField = uieditfield(app.PlayerComparisonTab, 'text');
            app.TEAM2EditField.Position = [1080 253 100 22];

            % Create TEAM1EditFieldLabel
            app.TEAM1EditFieldLabel = uilabel(app.PlayerComparisonTab);
            app.TEAM1EditFieldLabel.HorizontalAlignment = 'right';
            app.TEAM1EditFieldLabel.Position = [232 253 48 22];
            app.TEAM1EditFieldLabel.Text = 'TEAM 1';

            % Create TEAM1EditField
            app.TEAM1EditField = uieditfield(app.PlayerComparisonTab, 'text');
            app.TEAM1EditField.Position = [295 253 100 22];

            % Create Label3_3
            app.Label3_3 = uilabel(app.PlayerComparisonTab);
            app.Label3_3.WordWrap = 'on';
            app.Label3_3.FontSize = 15;
            app.Label3_3.Position = [25 628 394 132];
            app.Label3_3.Text = 'RULES: Select the checkboxes for each statistic you believe the left player has a higher average in compared to the right player. You will receive 1 point for each correct answer and lose 1 points for a wrong answer. Click new round to start another round in the same game. Select reset score to start again entirely. Have fun!';

            % Create KeyTab
            app.KeyTab = uitab(app.TabGroup);
            app.KeyTab.Title = 'Key';

            % Create XAXISAgeAgeGGamePlayedGSGamesStartedPFPersonalFoulsLabel
            app.XAXISAgeAgeGGamePlayedGSGamesStartedPFPersonalFoulsLabel = uilabel(app.KeyTab);
            app.XAXISAgeAgeGGamePlayedGSGamesStartedPFPersonalFoulsLabel.WordWrap = 'on';
            app.XAXISAgeAgeGGamePlayedGSGamesStartedPFPersonalFoulsLabel.Position = [159 550 128 165];
            app.XAXISAgeAgeGGamePlayedGSGamesStartedPFPersonalFoulsLabel.Text = {'X - AXIS:                       --------------------------------  '; 'Age = Age                   G = Game Played         GS = Games Started '; 'PF = Personal Fouls'};

            % Create TAB3PlayerGuessLabel
            app.TAB3PlayerGuessLabel = uilabel(app.KeyTab);
            app.TAB3PlayerGuessLabel.FontWeight = 'bold';
            app.TAB3PlayerGuessLabel.Position = [535 692 122 22];
            app.TAB3PlayerGuessLabel.Text = 'TAB 3: Player Guess';

            % Create TAB4PlayerComparisonLabel
            app.TAB4PlayerComparisonLabel = uilabel(app.KeyTab);
            app.TAB4PlayerComparisonLabel.FontWeight = 'bold';
            app.TAB4PlayerComparisonLabel.Position = [875 692 155 22];
            app.TAB4PlayerComparisonLabel.Text = 'TAB 4: Player Comparison';

            % Create TAB2PlayerGraphsLabel
            app.TAB2PlayerGraphsLabel = uilabel(app.KeyTab);
            app.TAB2PlayerGraphsLabel.FontWeight = 'bold';
            app.TAB2PlayerGraphsLabel.Position = [160 693 127 22];
            app.TAB2PlayerGraphsLabel.Text = 'TAB 2: Player Graphs';

            % Create YAXISPTSLabel
            app.YAXISPTSLabel = uilabel(app.KeyTab);
            app.YAXISPTSLabel.WordWrap = 'on';
            app.YAXISPTSLabel.Position = [159 318 139 253];
            app.YAXISPTSLabel.Text = {'Y - AXIS                               --------------------------------'; 'PTS = Points per game    FG_ = Field Goal %        x3P_ = Three Point %         x2P_ = Tow Point %          FT_ = Free Throw %            STL = Steals per game          BLK = Blocks per game                  TOV = Turnovers per game                                    OFFENSE = estimated offensive production             DEFENSE = estimated defensive production'};

            % Create Label3_5
            app.Label3_5 = uilabel(app.KeyTab);
            app.Label3_5.WordWrap = 'on';
            app.Label3_5.Position = [158 118 125 177];
            app.Label3_5.Text = 'Gradient                         ------------------------------- TRB = Total Rebounds per game                       MP = Minuted Played per game                           x3P = Three Pointers made per game                 x2P = Two Pointers made per game                                            FT = Free Throws made per game ';

            % Create HINTSLabel
            app.HINTSLabel = uilabel(app.KeyTab);
            app.HINTSLabel.WordWrap = 'on';
            app.HINTSLabel.Position = [534 536 127 178];
            app.HINTSLabel.Text = 'HINTS:                           -------------------------------PTS = Points per game  AST = Assists per game                                STL = Steals per game         BLK = Blocks per game  ';

            % Create CHECKBOXESAPGAssisstpergamePPGPointspergameLabel
            app.CHECKBOXESAPGAssisstpergamePPGPointspergameLabel = uilabel(app.KeyTab);
            app.CHECKBOXESAPGAssisstpergamePPGPointspergameLabel.WordWrap = 'on';
            app.CHECKBOXESAPGAssisstpergamePPGPointspergameLabel.Position = [885 558 140 141];
            app.CHECKBOXESAPGAssisstpergamePPGPointspergameLabel.Text = 'CHECKBOXES:                 --------------------------------APG = Assisst per game                              PPG = Points per game  SPG = Steals per game      BPG = Blocks per game    Fouls = Fouls per game   ';

            % Create Label
            app.Label = uilabel(app.KeyTab);
            app.Label.WordWrap = 'on';
            app.Label.Position = [405 112 10 607];
            app.Label.Text = '////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////';

            % Create Label_2
            app.Label_2 = uilabel(app.KeyTab);
            app.Label_2.WordWrap = 'on';
            app.Label_2.Position = [774 112 10 607];
            app.Label_2.Text = '////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////';

            % Show the figure after all components are created
            app.UIFigure.Visible = 'on';
        end
    end

    % App creation and deletion
    methods (Access = public)

        % Construct app
        function app = FINAL_NOKEY

            % Create UIFigure and components
            createComponents(app)

            % Register the app with App Designer
            registerApp(app, app.UIFigure)

            % Execute the startup function
            runStartupFcn(app, @startupFcn)

            if nargout == 0
                clear app
            end
        end

        % Code that executes before app deletion
        function delete(app)

            % Delete UIFigure when app is deleted
            delete(app.UIFigure)
        end
    end
end
